/**
 * Chat Export API
 *
 * POST /api/chat/rooms/[id]/export - Export chat history and send via email
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

// Type for room with participants and property included
type ChatRoomWithDetails = Prisma.ChatRoomGetPayload<{
  include: {
    participants: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    property: {
      select: {
        name: true;
      };
    };
  };
}>;

// Type for message with sender included
type ChatMessageWithSender = Prisma.ChatMessageGetPayload<{
  include: {
    sender: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

/**
 * POST /api/chat/rooms/[id]/export
 * Export chat history and send to user's email
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: roomId } = await context.params;

    // Verify user is a participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id
      }
    });

    if (!participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get room details
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        property: {
          select: {
            name: true
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get all messages from the room
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    // Generate room name
    const otherUser =
      room.type === "DIRECT"
        ? room.participants.find((p) => p.userId !== session.user.id)?.user
        : null;

    const roomName =
      room.type === "DIRECT" && otherUser
        ? `${otherUser.name || otherUser.email}`
        : room.name || "Unnamed Room";

    // Generate HTML content for email
    const htmlContent = generateChatExportHTML(
      room,
      messages,
      roomName,
      session.user.name || session.user.email
    );
    const textContent = generateChatExportText(room, messages, roomName);

    // Send email
    console.log(
      `📧 Attempting to send chat export to ${session.user.email}...`
    );
    console.log(`📊 Chat details: ${roomName}, ${messages.length} messages`);

    const result = await sendEmail({
      to: session.user.email,
      subject: `Chat Export: ${roomName}`,
      html: htmlContent,
      text: textContent
    });

    if (!result.success) {
      console.error("❌ Failed to send email:", result.error);
      throw new Error(result.error || "Failed to send email");
    }

    console.log("✅ Chat export email sent successfully");

    return NextResponse.json({
      success: true,
      message: "Chat history has been sent to your email"
    });
  } catch (error) {
    console.error("❌ Error exporting chat:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to export chat";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Generate HTML content for chat export email
 */
function generateChatExportHTML(
  room: ChatRoomWithDetails,
  messages: ChatMessageWithSender[],
  roomName: string,
  userName: string
): string {
  const messageCount = messages.length;
  const exportDate = format(new Date(), "PPpp");

  let messagesHTML = "";
  messages.forEach((msg) => {
    const timestamp = format(new Date(msg.createdAt), "PPpp");
    const senderName = msg.sender?.name || msg.sender?.email || "Unknown";
    const content = msg.content || "[Attachment]";

    messagesHTML += `
      <div style="margin-bottom: 16px; padding: 12px; background-color: #f9fafb; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong style="color: #1f2937;">${senderName}</strong>
          <span style="color: #6b7280; font-size: 12px;">${timestamp}</span>
        </div>
        <div style="color: #374151;">${content}</div>
        ${
          msg.attachmentUrl
            ? `<div style="margin-top: 8px;"><a href="${
                msg.attachmentUrl
              }" style="color: #7c3aed;">📎 ${
                msg.attachmentName || "Attachment"
              }</a></div>`
            : ""
        }
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Chat Export: ${roomName}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px;">💬 Chat Export</h1>
        <p style="margin: 0; opacity: 0.9; font-size: 16px;">Exported on ${exportDate}</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">Chat Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 150px;">Chat Name:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${roomName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Type:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${getRoomTypeLabel(
              room.type
            )}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Participants:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${
              room.participants.length
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Messages:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${messageCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Exported by:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${userName}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">Messages</h2>
        ${
          messagesHTML ||
          '<p style="color: #6b7280; text-align: center; padding: 20px;">No messages in this chat</p>'
        }
      </div>

      <div style="margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0;">This is an automated export from your Property Management System</p>
        <p style="margin: 8px 0 0 0;">Please do not reply to this email</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text content for chat export email
 */
function generateChatExportText(
  room: ChatRoomWithDetails,
  messages: ChatMessageWithSender[],
  roomName: string
): string {
  const exportDate = format(new Date(), "PPpp");
  const messageCount = messages.length;

  let text = `CHAT EXPORT\n`;
  text += `Exported on: ${exportDate}\n\n`;
  text += `===========================================\n\n`;
  text += `CHAT DETAILS\n`;
  text += `Chat Name: ${roomName}\n`;
  text += `Type: ${getRoomTypeLabel(room.type)}\n`;
  text += `Participants: ${room.participants.length}\n`;
  text += `Messages: ${messageCount}\n\n`;
  text += `===========================================\n\n`;
  text += `MESSAGES\n\n`;

  if (messages.length === 0) {
    text += `No messages in this chat\n`;
  } else {
    messages.forEach((msg) => {
      const timestamp = format(new Date(msg.createdAt), "PPpp");
      const senderName = msg.sender?.name || msg.sender?.email || "Unknown";
      const content = msg.content || "[Attachment]";

      text += `[${timestamp}] ${senderName}\n`;
      text += `${content}\n`;
      if (msg.attachmentUrl) {
        text += `📎 Attachment: ${msg.attachmentName || "File"} - ${
          msg.attachmentUrl
        }\n`;
      }
      text += `\n`;
    });
  }

  text += `===========================================\n\n`;
  text += `This is an automated export from your Property Management System\n`;
  text += `Please do not reply to this email\n`;

  return text;
}

/**
 * Get human-readable room type label
 */
function getRoomTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DIRECT: "Direct Message",
    GROUP: "Group Chat",
    PROPERTY: "Property Channel",
    ORGANIZATION: "Organization Channel"
  };
  return labels[type] || type;
}
