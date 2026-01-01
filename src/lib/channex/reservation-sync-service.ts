/**
 * Reservation Sync Service
 *
 * Handles creating/updating reservations from Channex bookings (OTAs).
 * Maps Channex booking data to PMS Reservation model.
 */

import { prisma } from "@/lib/prisma";
import type { ChannexReservation } from "./types";
import {
  ReservationSource,
  ReservationStatus,
  ChannelType
} from "@prisma/client";
import { onReservationChange } from "./event-triggers";

/**
 * Map Channex channel name to ChannelType enum
 */
function mapChannelType(channelName: string): ChannelType {
  const name = channelName.toLowerCase();
  if (name.includes("booking")) return ChannelType.BOOKING_COM;
  if (name.includes("expedia")) return ChannelType.EXPEDIA;
  if (name.includes("airbnb")) return ChannelType.AIRBNB;
  if (name.includes("vrbo")) return ChannelType.VRBO;
  return ChannelType.OTHER;
}

/**
 * Map Channex reservation status to PMS ReservationStatus
 */
function mapReservationStatus(channexStatus: string): ReservationStatus {
  switch (channexStatus) {
    case "new":
      return ReservationStatus.CONFIRMED; // OTA bookings are already confirmed
    case "modified":
      return ReservationStatus.CONFIRMED;
    case "cancelled":
      return ReservationStatus.CANCELLED;
    default:
      return ReservationStatus.CONFIRMED;
  }
}

export class ReservationSyncService {
  /**
   * Handle new booking from OTA via Channex webhook
   */
  async handleNewBooking(booking: ChannexReservation): Promise<string[]> {
    console.log(`📥 Processing new Channex booking: ${booking.id}`);
    const createdReservationIds: string[] = [];

    // Find property mapping
    const channexProperty = await prisma.channexProperty.findFirst({
      where: { channexPropertyId: booking.property_id },
      include: {
        property: true,
        roomTypeMappings: { where: { isActive: true } }
      }
    });

    if (!channexProperty) {
      throw new Error(
        `No property mapping for Channex property ${booking.property_id}`
      );
    }

    // Find or create channel
    const channel = await this.getOrCreateChannel(
      channexProperty.property.organizationId,
      booking.channel
    );

    // Process each room in the booking
    for (const room of booking.rooms) {
      const roomTypeMapping = channexProperty.roomTypeMappings.find(
        (m) => m.channexRoomTypeId === room.room_type_id
      );

      if (!roomTypeMapping) {
        console.warn(
          `No room type mapping for Channex room type ${room.room_type_id}`
        );
        continue;
      }

      // Find available room of this type
      const availableRoom = await this.findAvailableRoom(
        roomTypeMapping.roomTypeId,
        new Date(room.checkin_date),
        new Date(room.checkout_date)
      );

      if (!availableRoom) {
        console.error(
          `No available room for booking ${booking.id}, room type ${roomTypeMapping.roomTypeId}`
        );
        // TODO: Send alert/notification for overbooking
        continue;
      }

      // Build the guest name
      const guestName =
        `${booking.guest.first_name} ${booking.guest.last_name}`.trim();

      // Create reservation
      const reservation = await prisma.reservation.create({
        data: {
          organizationId: channexProperty.property.organizationId,
          propertyId: channexProperty.propertyId,
          roomId: availableRoom.id,
          channelId: channel.id,
          source: ReservationSource.CHANNEL,
          status: mapReservationStatus(booking.status),
          guestName,
          email: booking.guest.email,
          phone: booking.guest.phone ?? null,
          checkIn: new Date(room.checkin_date),
          checkOut: new Date(room.checkout_date),
          adults: room.guests?.adults ?? 1,
          children: room.guests?.children ?? 0,
          notes: this.buildNotesFromBooking(booking),
          paidAmount: booking.total_price,
          paymentStatus: "PAID" // OTAs typically collect payment
        }
      });

      createdReservationIds.push(reservation.id);
      console.log(
        `✅ Created reservation ${reservation.id} from ${booking.channel}`
      );

      // Trigger ARI sync to update availability on other OTAs
      await onReservationChange({
        propertyId: channexProperty.propertyId,
        roomTypeId: roomTypeMapping.roomTypeId,
        checkIn: new Date(room.checkin_date),
        checkOut: new Date(room.checkout_date),
        reservationId: reservation.id,
        action: "create",
        triggeredBy: "channex-webhook"
      });

      // Create audit log
      await this.createAuditLog(
        reservation.id,
        channexProperty.propertyId,
        "CREATED",
        booking
      );
    }

    return createdReservationIds;
  }

  /**
   * Handle modified booking from OTA
   */
  async handleModifiedBooking(booking: ChannexReservation): Promise<void> {
    console.log(`📝 Processing modified Channex booking: ${booking.id}`);

    // Find existing reservation by Channex ID in notes
    const existingReservation = await this.findReservationByChannexId(
      booking.id
    );

    if (!existingReservation) {
      // Booking doesn't exist locally, create it
      console.log(`Reservation not found for ${booking.id}, creating new one`);
      await this.handleNewBooking(booking);
      return;
    }

    const guestName =
      `${booking.guest.first_name} ${booking.guest.last_name}`.trim();
    const firstRoom = booking.rooms[0];

    // Update reservation
    await prisma.reservation.update({
      where: { id: existingReservation.id },
      data: {
        guestName,
        email: booking.guest.email,
        phone: booking.guest.phone ?? existingReservation.phone,
        checkIn: firstRoom ? new Date(firstRoom.checkin_date) : undefined,
        checkOut: firstRoom ? new Date(firstRoom.checkout_date) : undefined,
        adults: firstRoom?.guests?.adults ?? existingReservation.adults,
        children: firstRoom?.guests?.children ?? existingReservation.children,
        paidAmount: booking.total_price,
        notes: this.buildNotesFromBooking(booking)
      }
    });

    console.log(`✅ Updated reservation ${existingReservation.id}`);

    // Trigger ARI sync if dates changed
    if (firstRoom && existingReservation.room.roomTypeId) {
      await onReservationChange({
        propertyId: existingReservation.propertyId,
        roomTypeId: existingReservation.room.roomTypeId,
        checkIn: new Date(firstRoom.checkin_date),
        checkOut: new Date(firstRoom.checkout_date),
        reservationId: existingReservation.id,
        action: "update",
        triggeredBy: "channex-webhook"
      });
    }

    // Create audit log
    await this.createAuditLog(
      existingReservation.id,
      existingReservation.propertyId,
      "UPDATED",
      booking
    );
  }

  /**
   * Handle cancelled booking from OTA
   */
  async handleCancelledBooking(booking: ChannexReservation): Promise<void> {
    console.log(`❌ Processing cancelled Channex booking: ${booking.id}`);

    const existingReservation = await this.findReservationByChannexId(
      booking.id
    );

    if (!existingReservation) {
      console.warn(`Reservation not found for cancelled booking ${booking.id}`);
      return;
    }

    await prisma.reservation.update({
      where: { id: existingReservation.id },
      data: {
        status: ReservationStatus.CANCELLED,
        statusChangeReason: `Cancelled via ${booking.channel}`,
        statusUpdatedAt: new Date(),
        deletedAt: new Date() // Soft delete
      }
    });

    console.log(`✅ Cancelled reservation ${existingReservation.id}`);

    // Trigger ARI sync to free up availability
    if (existingReservation.room.roomTypeId) {
      await onReservationChange({
        propertyId: existingReservation.propertyId,
        roomTypeId: existingReservation.room.roomTypeId,
        checkIn: existingReservation.checkIn,
        checkOut: existingReservation.checkOut,
        reservationId: existingReservation.id,
        action: "cancel",
        triggeredBy: "channex-webhook"
      });
    }

    // Create audit log
    await this.createAuditLog(
      existingReservation.id,
      existingReservation.propertyId,
      "CANCELLED",
      booking
    );
  }

  /**
   * Find reservation by Channex booking ID stored in notes
   */
  private async findReservationByChannexId(channexBookingId: string) {
    return prisma.reservation.findFirst({
      where: {
        notes: { contains: channexBookingId },
        source: ReservationSource.CHANNEL
      },
      include: { room: true }
    });
  }

  /**
   * Find or create a Channel record for the OTA
   */
  private async getOrCreateChannel(
    organizationId: string,
    channelName: string
  ) {
    let channel = await prisma.channel.findFirst({
      where: {
        organizationId,
        name: { equals: channelName, mode: "insensitive" }
      }
    });

    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          organizationId,
          name: channelName,
          type: mapChannelType(channelName)
        }
      });
      console.log(`📺 Created new channel: ${channelName}`);
    }

    return channel;
  }

  /**
   * Find an available room of the specified type for the date range
   */
  private async findAvailableRoom(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date
  ) {
    // Get all rooms of this type
    const rooms = await prisma.room.findMany({
      where: { roomTypeId },
      include: {
        reservations: {
          where: {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
            status: {
              notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW]
            },
            deletedAt: null
          }
        },
        roomBlocks: {
          where: {
            startDate: { lte: checkOut },
            endDate: { gte: checkIn }
          }
        }
      }
    });

    // Find first available room (no overlapping reservations or blocks)
    return rooms.find(
      (room) => room.reservations.length === 0 && room.roomBlocks.length === 0
    );
  }

  /**
   * Build notes string from Channex booking
   */
  private buildNotesFromBooking(booking: ChannexReservation): string {
    const notes = [
      `OTA: ${booking.channel}`,
      `Channex ID: ${booking.id}`,
      `Currency: ${booking.currency}`,
      `Total: ${booking.total_price} ${booking.currency}`
    ];
    return notes.join("\n");
  }

  /**
   * Create audit log entry for reservation changes
   */
  private async createAuditLog(
    reservationId: string,
    propertyId: string,
    action: "CREATED" | "UPDATED" | "CANCELLED",
    booking: ChannexReservation
  ) {
    await prisma.reservationAuditLog.create({
      data: {
        reservationId,
        propertyId,
        action,
        description: `${action} from ${booking.channel} via Channex`,
        changedAt: new Date(),
        metadata: JSON.stringify({
          source: "channex",
          channexBookingId: booking.id,
          channel: booking.channel,
          status: booking.status
        })
      }
    });
  }
}

// Singleton instance
let reservationSyncServiceInstance: ReservationSyncService | null = null;

export function getReservationSyncService(): ReservationSyncService {
  if (!reservationSyncServiceInstance) {
    reservationSyncServiceInstance = new ReservationSyncService();
  }
  return reservationSyncServiceInstance;
}
