"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Trash2, Star } from "lucide-react";
import { SavedPaymentMethod } from "@/lib/payments/types";
import {
  Visa,
  Mastercard,
  Amex,
  Discover,
  Jcb,
  Diners,
  Unionpay,
  Maestro,
  Elo,
  Hipercard
} from "react-payment-logos/dist/flat";

// Utility functions
const getCardIcon = (brand: string) => {
  const iconClass = "h-4 w-4";

  switch (brand?.toLowerCase()) {
    case "visa":
      return <Visa className={iconClass} />;
    case "mastercard":
      return <Mastercard className={iconClass} />;
    case "amex":
    case "american_express":
      return <Amex className={iconClass} />;
    case "discover":
      return <Discover className={iconClass} />;
    case "jcb":
      return <Jcb className={iconClass} />;
    case "diners":
    case "diners_club":
      return <Diners className={iconClass} />;
    case "unionpay":
      return <Unionpay className={iconClass} />;
    case "maestro":
      return <Maestro className={iconClass} />;
    case "elo":
      return <Elo className={iconClass} />;
    case "hipercard":
      return <Hipercard className={iconClass} />;
    default:
      // Default fallback for unknown brands
      return <CreditCard className={iconClass} />;
  }
};

const formatCardBrand = (brand: string) => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

const formatExpiryDate = (month?: number, year?: number) => {
  if (!month || !year) return "";
  return `${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`;
};

interface PaymentMethodSelectorProps {
  savedMethods: SavedPaymentMethod[];
  selectedMethodId?: string;
  onSelectMethod: (methodId: string | null) => void;
  onAddNewMethod: () => void;
  onDeleteMethod?: (methodId: string) => void;
  onSetDefault?: (methodId: string) => void;
  loading?: boolean;
  showAddNew?: boolean;
  allowDelete?: boolean;
  allowSetDefault?: boolean;
}

export function PaymentMethodSelector({
  savedMethods,
  selectedMethodId,
  onSelectMethod,
  onAddNewMethod,
  onDeleteMethod,
  onSetDefault,
  loading = false,
  showAddNew = true,
  allowDelete = true,
  allowSetDefault = true
}: PaymentMethodSelectorProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const handleDeleteMethod = async (methodId: string) => {
    if (!onDeleteMethod) return;

    setDeletingId(methodId);
    try {
      await onDeleteMethod(methodId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    if (!onSetDefault) return;

    setSettingDefaultId(methodId);
    try {
      await onSetDefault(methodId);
    } finally {
      setSettingDefaultId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Payment Methods</h3>
        {showAddNew && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddNewMethod}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        )}
      </div>

      {savedMethods.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium mb-2">No saved payment methods</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payment method to make future bookings faster
            </p>
            {showAddNew && (
              <Button onClick={onAddNewMethod} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <RadioGroup
          value={selectedMethodId || "new"}
          onValueChange={(value) =>
            onSelectMethod(value === "new" ? null : value)
          }
        >
          {/* Saved Payment Methods */}
          {savedMethods.map((method) => (
            <div key={method.id} className="relative">
              <Label htmlFor={method.id} className="cursor-pointer">
                <Card
                  className={`transition-colors ${
                    selectedMethodId === method.id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={method.id} id={method.id} />

                      <div className="flex items-center space-x-3 flex-1">
                        {getCardIcon(method.cardBrand || "card")}

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {formatCardBrand(method.cardBrand || "Card")} ••••{" "}
                              {method.cardLast4}
                            </span>
                            {method.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Expires{" "}
                            {formatExpiryDate(
                              method.cardExpMonth,
                              method.cardExpYear
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {allowSetDefault && !method.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSetDefault(method.id);
                            }}
                            disabled={settingDefaultId === method.id}
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}

                        {allowDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteMethod(method.id);
                            }}
                            disabled={deletingId === method.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}

          {/* Add New Payment Method Option */}
          {showAddNew && (
            <Label htmlFor="new" className="cursor-pointer">
              <Card
                className={`transition-colors border-dashed ${
                  selectedMethodId === null
                    ? "ring-2 ring-primary border-primary"
                    : "hover:border-muted-foreground/50"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="new" id="new" />
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Add new payment method</span>
                  </div>
                </CardContent>
              </Card>
            </Label>
          )}
        </RadioGroup>
      )}
    </div>
  );
}

// Compact version for use in modals/sheets
export function CompactPaymentMethodSelector({
  savedMethods,
  selectedMethodId,
  onSelectMethod,
  onAddNewMethod,
  loading = false
}: Pick<
  PaymentMethodSelectorProps,
  | "savedMethods"
  | "selectedMethodId"
  | "onSelectMethod"
  | "onAddNewMethod"
  | "loading"
>) {
  return (
    <div className="space-y-3">
      <RadioGroup
        value={selectedMethodId || "new"}
        onValueChange={(value) => {
          if (value === "new") {
            onAddNewMethod();
            onSelectMethod(null);
          } else {
            onSelectMethod(value);
          }
        }}
        disabled={loading}
      >
        {savedMethods.map((method) => (
          <Label
            key={method.id}
            htmlFor={`compact-${method.id}`}
            className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/50 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <RadioGroupItem
              value={method.id}
              id={`compact-${method.id}`}
              disabled={loading}
            />
            {getCardIcon(method.cardBrand || "card")}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {formatCardBrand(method.cardBrand || "Card")} ••••{" "}
                  {method.cardLast4}
                </span>
                {method.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
            </div>
          </Label>
        ))}

        <Label
          htmlFor="compact-new"
          className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-dashed hover:bg-muted/50 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <RadioGroupItem value="new" id="compact-new" disabled={loading} />
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Add new payment method</span>
        </Label>
      </RadioGroup>
    </div>
  );
}
