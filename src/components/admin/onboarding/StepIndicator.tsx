"use client";

// Step indicator component for onboarding flow

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OnboardingStep,
  StepIndicatorProps
} from "@/lib/types/organization-onboarding";
import { STEP_TITLES } from "@/lib/validations/organization-onboarding";

export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick
}: StepIndicatorProps) {
  const steps: OnboardingStep[] = [1, 2, 3];

  const getStepStatus = (step: OnboardingStep) => {
    if (completedSteps.includes(step)) return "completed";
    if (step === currentStep) return "current";
    if (step < currentStep) return "completed";
    return "upcoming";
  };

  const isClickable = (step: OnboardingStep) => {
    return (
      onStepClick && (step <= currentStep || completedSteps.includes(step))
    );
  };

  return (
    <div className="w-full">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center gap-8">
          {steps.map((step, stepIndex) => {
            const status = getStepStatus(step);
            const isLast = stepIndex === steps.length - 1;
            const clickable = isClickable(step);

            return (
              <li key={step} className="flex items-center">
                {/* Step Circle */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => clickable && onStepClick?.(step)}
                    disabled={!clickable}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-medium transition-all duration-200",
                      {
                        // Completed step
                        "bg-purple-600 border-purple-600 text-white hover:bg-purple-700":
                          status === "completed",

                        // Current step
                        "bg-white border-purple-600 text-purple-600 ring-4 ring-purple-100 dark:bg-gray-900 dark:ring-purple-900/20":
                          status === "current",

                        // Upcoming step
                        "bg-white border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400":
                          status === "upcoming",

                        // Clickable states
                        "cursor-pointer hover:border-purple-500":
                          clickable && status !== "current",

                        "cursor-not-allowed": !clickable
                      }
                    )}
                    aria-current={status === "current" ? "step" : undefined}
                  >
                    {status === "completed" ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{step}</span>
                    )}
                  </button>

                  {/* Step Label */}
                  <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-center min-w-max">
                    <p
                      className={cn(
                        "text-sm font-medium transition-colors duration-200",
                        {
                          "text-purple-600 dark:text-purple-400":
                            status === "current" || status === "completed",
                          "text-gray-500 dark:text-gray-400":
                            status === "upcoming"
                        }
                      )}
                    >
                      {STEP_TITLES[step]}
                    </p>
                  </div>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div className="w-16 mx-2">
                    <div
                      className={cn("h-0.5 transition-colors duration-200", {
                        "bg-purple-600":
                          step < currentStep || completedSteps.includes(step),
                        "bg-gray-300 dark:bg-gray-600":
                          step >= currentStep && !completedSteps.includes(step)
                      })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress Bar (Alternative Visual) */}
      <div className="mt-8">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>
            Step {currentStep} of {steps.length}
          </span>
          <span>
            {Math.round((currentStep / steps.length) * 100)}% Complete
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Alternative compact step indicator for mobile
export function CompactStepIndicator({
  currentStep,
  completedSteps
}: Omit<StepIndicatorProps, "onStepClick">) {
  const steps: OnboardingStep[] = [1, 2, 3];

  return (
    <div className="flex items-center justify-center space-x-2">
      {steps.map((step) => {
        const status = completedSteps.includes(step)
          ? "completed"
          : step === currentStep
          ? "current"
          : "upcoming";

        return (
          <div
            key={step}
            className={cn("w-3 h-3 rounded-full transition-all duration-200", {
              "bg-purple-600": status === "completed" || status === "current",
              "bg-gray-300 dark:bg-gray-600": status === "upcoming",
              "ring-2 ring-purple-200 dark:ring-purple-800":
                status === "current"
            })}
          />
        );
      })}
    </div>
  );
}

// Step indicator with labels below (for wider layouts)
export function HorizontalStepIndicator({
  currentStep,
  completedSteps,
  onStepClick
}: StepIndicatorProps) {
  const steps: OnboardingStep[] = [1, 2, 3];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-300 dark:bg-gray-600" />

        {steps.map((step) => {
          const status = completedSteps.includes(step)
            ? "completed"
            : step === currentStep
            ? "current"
            : step < currentStep
            ? "completed"
            : "upcoming";

          const clickable =
            onStepClick &&
            (step <= currentStep || completedSteps.includes(step));

          return (
            <div
              key={step}
              className="flex flex-col items-center relative z-10"
            >
              <button
                type="button"
                onClick={() => clickable && onStepClick?.(step)}
                disabled={!clickable}
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200",
                  {
                    "bg-purple-600 border-purple-600 text-white":
                      status === "completed",
                    "bg-white border-purple-600 text-purple-600 ring-4 ring-purple-100 dark:bg-gray-900":
                      status === "current",
                    "bg-white border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600":
                      status === "upcoming",
                    "cursor-pointer hover:border-purple-500":
                      clickable && status !== "current",
                    "cursor-not-allowed": !clickable
                  }
                )}
              >
                {status === "completed" ? <Check className="w-5 h-5" /> : step}
              </button>

              <span
                className={cn("mt-2 text-xs font-medium text-center", {
                  "text-purple-600 dark:text-purple-400":
                    status === "current" || status === "completed",
                  "text-gray-500 dark:text-gray-400": status === "upcoming"
                })}
              >
                {STEP_TITLES[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
