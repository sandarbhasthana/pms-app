"use client";

import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export function StripeProvider({
  children,
  clientSecret
}: StripeProviderProps) {
  const { theme } = useTheme();

  // Memoize appearance configuration to prevent unnecessary re-renders
  const appearance = React.useMemo(
    () => ({
      theme: (theme === "dark" ? "night" : "stripe") as "night" | "stripe",
      variables: {
        // Color scheme that matches your app
        colorPrimary: "#7210a2", // Your brand purple
        colorBackground: theme === "dark" ? "#1e1e1e" : "#ffffff",
        colorText: theme === "dark" ? "#f0f8ff" : "#1e1e1e",
        colorDanger: "#df1b41",
        colorSuccess: "#059669",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "6px",
        // Input styling
        colorTextSecondary: theme === "dark" ? "#a1a1aa" : "#6b7280",
        colorTextPlaceholder: theme === "dark" ? "#71717a" : "#9ca3af",
        colorIconTab: theme === "dark" ? "#a1a1aa" : "#6b7280",
        colorIconTabSelected: "#7210a2",
        colorIconCardError: "#df1b41",
        // Border colors
        colorBorder: theme === "dark" ? "#374151" : "#d1d5db",
        colorBorderFocus: "#7210a2",
        colorBorderError: "#df1b41"
      },
      rules: {
        ".Input": {
          backgroundColor: theme === "dark" ? "#1e1e1e" : "#ffffff",
          border: `1px solid ${theme === "dark" ? "#374151" : "#d1d5db"}`,
          borderRadius: "6px",
          padding: "12px",
          fontSize: "14px",
          color: theme === "dark" ? "#f0f8ff" : "#1e1e1e"
        },
        ".Input::placeholder": {
          color: theme === "dark" ? "#71717a" : "#9ca3af"
        },
        ".Input:focus": {
          borderColor: "#7210a2",
          boxShadow: `0 0 0 1px #7210a2`,
          outline: "none"
        },
        ".Input--invalid": {
          borderColor: "#df1b41",
          boxShadow: `0 0 0 1px #df1b41`
        },
        ".Label": {
          fontSize: "14px",
          fontWeight: "500",
          color: theme === "dark" ? "#f0f8ff" : "#374151",
          marginBottom: "6px"
        },
        ".Error": {
          fontSize: "12px",
          color: "#df1b41",
          marginTop: "4px"
        },
        // Payment method tabs styling
        ".Tab": {
          backgroundColor: theme === "dark" ? "#374151" : "#f9fafb",
          border: `1px solid ${theme === "dark" ? "#4b5563" : "#e5e7eb"}`,
          borderRadius: "6px",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: "500",
          color: theme === "dark" ? "#d1d5db" : "#6b7280",
          cursor: "pointer",
          transition: "all 0.2s ease"
        },
        ".Tab:hover": {
          backgroundColor: theme === "dark" ? "#4b5563" : "#f3f4f6",
          borderColor: "#7210a2"
        },
        ".Tab--selected": {
          backgroundColor: "#7210a2",
          borderColor: "#7210a2",
          color: "#ffffff"
        },
        ".Tab--selected:hover": {
          backgroundColor: "#5f0d87" // Darker purple on hover
        },
        // Loading spinner
        ".Spinner": {
          color: "#7210a2"
        },
        // Payment element container
        ".PaymentElement": {
          padding: "0"
        },
        // Express checkout styling
        ".ExpressCheckout": {
          marginBottom: "16px"
        },
        ".ExpressCheckoutElement": {
          borderRadius: "6px",
          height: "40px"
        }
      }
    }),
    [theme]
  );

  // Memoize options to prevent unnecessary re-renders
  const options = React.useMemo(() => {
    const baseOptions = {
      appearance,
      locale: "en" as const
    };

    // Add clientSecret only if it exists
    if (clientSecret) {
      return {
        ...baseOptions,
        clientSecret
      };
    }

    return baseOptions;
  }, [appearance, clientSecret]);

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}

// Hook to use Stripe in components
export { useStripe, useElements } from "@stripe/react-stripe-js";

// Re-export Stripe Elements for convenience
export {
  PaymentElement,
  CardElement,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  ExpressCheckoutElement
} from "@stripe/react-stripe-js";

// Custom hook for Stripe theme updates
export function useStripeTheme() {
  const { theme } = useTheme();

  return React.useMemo(
    () => ({
      theme: theme === "dark" ? "night" : ("stripe" as const),
      variables: {
        colorPrimary: "#7210a2",
        colorBackground: theme === "dark" ? "#1e1e1e" : "#ffffff",
        colorText: theme === "dark" ? "#f0f8ff" : "#1e1e1e",
        fontFamily: "Inter, system-ui, sans-serif"
      }
    }),
    [theme]
  );
}
