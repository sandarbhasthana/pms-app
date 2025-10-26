"use client";

import React, { useState } from "react";
import { TrashIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
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
} from "react-payment-logos/dist/logo";

interface CreditCardDisplayProps {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  onDelete?: () => void;
  onSetDefault?: () => void;
  showActions?: boolean;
  cardholder?: string;
  gradientIndex?: number;
}

const CARD_BRANDS = {
  visa: {
    gradient: "from-[#1A1F71] to-[#0066B2]",
    logo: "VISA",
    textColor: "text-white"
  },
  mastercard: {
    gradient: "from-[#EB001B] to-[#F79E1B]",
    logo: "MASTERCARD",
    textColor: "text-white"
  },
  amex: {
    gradient: "from-[#006FCF] to-[#00A3E0]",
    logo: "AMEX",
    textColor: "text-white"
  },
  discover: {
    gradient: "from-[#FF6000] to-[#FFB81C]",
    logo: "DISCOVER",
    textColor: "text-white"
  },
  default: {
    gradient: "from-[#4A5568] to-[#718096]",
    logo: "CARD",
    textColor: "text-white"
  }
};

// Alternative gradients for multiple cards
const ALTERNATIVE_GRADIENTS = [
  "from-[#667eea] to-[#764ba2]", // Purple
  "from-[#f093fb] to-[#f5576c]", // Pink-Red
  "from-[#4facfe] to-[#00f2fe]", // Cyan-Blue
  "from-[#43e97b] to-[#38f9d7]", // Green-Teal
  "from-[#fa709a] to-[#fee140]", // Orange-Yellow
  "from-[#30cfd0] to-[#330867]", // Teal-Purple
  "from-[#a8edea] to-[#fed6e3]", // Mint-Pink
  "from-[#ff9a56] to-[#ff6a88]" // Orange-Red
];

// Helper function to render card brand logo
const getCardLogo = (brand: string) => {
  const logoClass = "h-16 w-auto";

  switch (brand?.toLowerCase()) {
    case "visa":
      return <Visa className={logoClass} />;
    case "mastercard":
      return <Mastercard className={logoClass} />;
    case "amex":
    case "american_express":
      return <Amex className={logoClass} />;
    case "discover":
      return <Discover className={logoClass} />;
    case "jcb":
      return <Jcb className={logoClass} />;
    case "diners":
    case "diners_club":
      return <Diners className={logoClass} />;
    case "unionpay":
      return <Unionpay className={logoClass} />;
    case "maestro":
      return <Maestro className={logoClass} />;
    case "elo":
      return <Elo className={logoClass} />;
    case "hipercard":
      return <Hipercard className={logoClass} />;
    default:
      return null;
  }
};

const CreditCardDisplayComponent: React.FC<CreditCardDisplayProps> = ({
  brand = "default",
  last4 = "0000",
  expMonth,
  expYear,
  isDefault = false,
  onDelete,
  onSetDefault,
  showActions = true,
  cardholder = "CARDHOLDER",
  gradientIndex = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Generate unique IDs for SVG elements to avoid conflicts with multiple cards
  const uniqueId = React.useMemo(
    () => Math.random().toString(36).substr(2, 9),
    []
  );
  const clipPathId = `clip-${uniqueId}`;
  const maskId = `mask-${uniqueId}`;

  // console.log(
  //   `💳 CreditCardDisplay rendered: last4=${last4}, isDefault=${isDefault}`
  // );

  const brandKey = (brand?.toLowerCase() ||
    "default") as keyof typeof CARD_BRANDS;

  // Use alternative gradient if gradientIndex is provided, otherwise use brand gradient
  let cardStyle = CARD_BRANDS[brandKey] || CARD_BRANDS.default;
  if (gradientIndex !== undefined && gradientIndex > 0) {
    const altGradient =
      ALTERNATIVE_GRADIENTS[(gradientIndex - 1) % ALTERNATIVE_GRADIENTS.length];
    cardStyle = {
      ...cardStyle,
      gradient: altGradient
    };
  }

  const expiryDisplay =
    expMonth && expYear
      ? `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`
      : "MM/YY";

  const isExpiringSoon =
    expMonth && expYear
      ? new Date(expYear, expMonth - 1) <=
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      : false;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const distanceX = mouseX - centerX;
    const distanceY = mouseY - centerY;

    // Calculate rotation angles (max 15 degrees)
    const rotationX = (distanceY / centerY) * 15;
    const rotationY = (distanceX / centerX) * -15;

    setRotateX(rotationX);
    setRotateY(rotationY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this card?")) {
      setIsDeleting(true);
      try {
        await onDelete?.();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      {/* Card Container with 3D Glassmorphism Effect */}
      <div
        ref={cardRef}
        className={`relative h-56 rounded-2xl overflow-hidden cursor-pointer transition-transform duration-100 ease-out`}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${
            isHovered ? 1.05 : 1
          })`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${cardStyle.gradient} opacity-95 rounded-2xl`}
        />

        {/* Glassmorphism Overlay - Enhanced */}
        <div className="absolute inset-0 backdrop-blur-md bg-white/15 rounded-2xl" />

        {/* Holographic Shimmer Effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-500 rounded-2xl ${
            isHovered ? "translate-x-full" : "-translate-x-full"
          }`}
          style={{
            transform: isHovered ? "translateX(100%)" : "translateX(-100%)"
          }}
        />

        {/* Card Content */}
        <div className="relative h-full p-6 flex flex-col justify-between text-white rounded-2xl">
          {/* Top Section: Chip and Logo */}
          <div className="flex justify-between items-start gap-2">
            {/* Chip and RFID Container */}
            <div className="flex gap-2 items-center">
              {/* Chip Icon - EMV Chip SVG */}
              <div className="w-12 h-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 609.928 609.928"
                  className="w-full h-full"
                >
                  <path
                    fill="#ffc738"
                    d="M570.267 542.516H39.542C17.746 542.516 0 524.769 0 502.854V106.955c0-21.796 17.746-39.542 39.542-39.542h530.605c21.915 0 39.661 17.746 39.661 39.542v395.899c.001 21.915-17.745 39.662-39.541 39.662z"
                  />
                  <path
                    fill="#ffb42e"
                    d="M570.267 67.412H304.904v475.103h265.362c21.915 0 39.542-17.746 39.542-39.542V106.955c.001-21.796-17.745-39.543-39.541-39.543z"
                  />
                  <path
                    fill="#c66d4e"
                    d="M609.809 313.123v-16.317H396.733v-72.057l55.026-55.026h158.05c0-5.598-.596-11.077-1.548-16.317H448.305c-2.144 0-4.288.953-5.717 2.501l-57.408 57.289h-72.057V67.412h-16.317v145.663h-71.224l-57.289-57.289c-1.548-1.548-3.692-2.501-5.836-2.501H1.667c-.953 5.36-1.548 10.838-1.548 16.317h159.003l53.954 53.954v73.01H0v16.317h213.076v73.01l-53.954 54.311H.119c0 5.598.596 11.077 1.548 16.317h160.909c2.144 0 4.288-.953 5.836-2.501l57.289-57.289h71.224v145.663h16.317V396.733h72.057l57.408 57.289c1.429 1.548 3.573 2.501 5.717 2.501H608.38c.953-5.36 1.548-10.838 1.548-16.317H451.64l-55.026-55.026v-72.057zm-229.393 67.293H229.393V229.393h150.904v151.023z"
                  />
                  <path
                    fill="#af5a35"
                    d="M609.809 313.123v-16.317H396.733v-72.057l55.026-55.026h158.05c0-5.598-.596-11.077-1.548-16.317H448.305c-2.144 0-4.288.953-5.717 2.501l-57.408 57.289h-72.057V67.412h-8.218v161.98h75.512v151.023h-75.512v161.981h8.218V396.733h72.057l57.408 57.289c1.429 1.548 3.573 2.501 5.717 2.501h159.956c.953-5.36 1.548-10.719 1.548-16.317H451.64l-55.026-55.026v-72.057z"
                  />
                </svg>
              </div>

              {/* RFID Icon - White */}
              <div className="w-8 h-6 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 682.667 682.667"
                  className="w-full h-full"
                >
                  <g transform="matrix(1,0,0,1,0,0)">
                    <defs>
                      <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
                        <path d="M0 512h512V0H0Z" fill="#ffffff" opacity="1" />
                      </clipPath>
                    </defs>
                    <mask id={maskId}>
                      <rect
                        width="100%"
                        height="100%"
                        fill="#ffffff"
                        opacity="1"
                      />
                    </mask>
                    <g mask={`url(#${maskId})`}>
                      <g
                        clipPath={`url(#${clipPathId})`}
                        transform="matrix(1.33333 0 0 -1.33333 0 682.667)"
                      >
                        <path
                          d="M0 0c133.101-133.101 133.101-348.899 0-482"
                          style={{
                            strokeWidth: 30,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeMiterlimit: 10,
                            strokeDasharray: "none",
                            strokeOpacity: 1
                          }}
                          transform="translate(302.487 497)"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="30"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeMiterlimit="10"
                        />
                        <path
                          d="M0 0c97.607-97.607 97.607-255.86 0-353.467"
                          style={{
                            strokeWidth: 30,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeMiterlimit: 10,
                            strokeDasharray: "none",
                            strokeOpacity: 1
                          }}
                          transform="translate(238.22 432.733)"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="30"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeMiterlimit="10"
                        />
                        <path
                          d="M0 0c62.114-62.114 62.114-162.82 0-224.933"
                          style={{
                            strokeWidth: 30,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeMiterlimit: 10,
                            strokeDasharray: "none",
                            strokeOpacity: 1
                          }}
                          transform="translate(173.954 368.467)"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="30"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeMiterlimit="10"
                        />
                        <path
                          d="M0 0c26.62-26.62 26.62-69.78 0-96.4"
                          style={{
                            strokeWidth: 30,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeMiterlimit: 10,
                            strokeDasharray: "none",
                            strokeOpacity: 1
                          }}
                          transform="translate(109.687 304.2)"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="30"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeMiterlimit="10"
                        />
                      </g>
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            {/* Brand Logo and Default Star */}
            <div className="flex flex-col items-end gap-2 justify-start relative">
              {isDefault && (
                <StarIconSolid
                  className="h-5 w-5 text-red-500 absolute -top-2 -right-2 stroke-white"
                  style={{ strokeWidth: "1.5px" }}
                />
              )}
              <div className="flex items-start justify-end">
                {getCardLogo(brand || "default")}
              </div>
            </div>
          </div>

          {/* Middle Section: Card Number */}
          <div className="space-y-2">
            <div className="text-xs opacity-75 tracking-wider">CARD NUMBER</div>
            <div className="font-mono text-xl tracking-widest">
              •••• •••• •••• {last4}
            </div>
          </div>

          {/* Bottom Section: Cardholder and Expiry */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs opacity-75">CARDHOLDER</div>
              <div className="font-semibold text-sm truncate max-w-xs">
                {cardholder}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-75">EXPIRES</div>
              <div className="font-mono text-lg">{expiryDisplay}</div>
            </div>
          </div>
        </div>

        {/* Shadow Effect */}
        <div
          className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
            isHovered ? "shadow-2xl" : "shadow-lg"
          }`}
          style={{
            boxShadow: isHovered
              ? "0 30px 80px rgba(0,0,0,0.4)"
              : "0 20px 60px rgba(0,0,0,0.3)"
          }}
        />
      </div>

      {/* Badges and Actions */}
      <div className="mt-4 space-y-3">
        {/* Expiry Warning Badge */}
        {isExpiringSoon && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
            ⚠️ Expires in{" "}
            {Math.ceil(
              (new Date(expYear!, expMonth! - 1).getTime() - Date.now()) /
                (30 * 24 * 60 * 60 * 1000)
            )}{" "}
            months
          </span>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 w-full">
            {!isDefault && onSetDefault && (
              <button
                type="button"
                onClick={onSetDefault}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg"
              >
                <StarIcon className="h-4 w-4" />
                Set Default
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrashIcon className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const CreditCardDisplay = React.memo(CreditCardDisplayComponent);

export default CreditCardDisplay;
