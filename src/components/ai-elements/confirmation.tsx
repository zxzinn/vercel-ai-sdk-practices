"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react";

// TODO: Remove these type definitions when AI SDK adds approval support
type ToolApproval = {
  approve: () => void;
  reject: () => void;
  approved?: boolean;
};

type ConfirmationContextValue = {
  approval?: ToolApproval;
  state: ToolUIPart["state"];
};

const ConfirmationContext = createContext<ConfirmationContextValue | null>(
  null
);

const useConfirmation = () => {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation");
  }

  return context;
};

export type ConfirmationProps = ComponentProps<typeof Alert> & {
  approval?: ToolApproval;
  state: ToolUIPart["state"];
};

export const Confirmation = ({
  className,
  approval,
  state,
  ...props
}: ConfirmationProps) => {
  if (!approval || state === "input-streaming" || state === "input-available") {
    return null;
  }

  return (
    <ConfirmationContext.Provider value={{ approval, state }}>
      <Alert className={cn("flex flex-col gap-2", className)} {...props} />
    </ConfirmationContext.Provider>
  );
};

export type ConfirmationTitleProps = ComponentProps<typeof AlertDescription>;

export const ConfirmationTitle = ({
  className,
  ...props
}: ConfirmationTitleProps) => (
  <AlertDescription className={cn("inline", className)} {...props} />
);

export type ConfirmationRequestProps = {
  children?: ReactNode;
};

export const ConfirmationRequest = ({ children }: ConfirmationRequestProps) => {
  const { state } = useConfirmation();

  // TODO: Enable when AI SDK adds approval-requested state
  // Only show when approval is requested
  // if (state !== "approval-requested") {
  //   return null;
  // }

  // For now, always return null since approval feature is not available yet
  return null;
};

export type ConfirmationAcceptedProps = {
  children?: ReactNode;
};

export const ConfirmationAccepted = ({
  children,
}: ConfirmationAcceptedProps) => {
  const { approval, state } = useConfirmation();

  // TODO: Enable when AI SDK adds approval states
  // Only show when approved and in response states
  // if (
  //   !approval?.approved ||
  //   (state !== "approval-responded" &&
  //     state !== "output-denied" &&
  //     state !== "output-available")
  // ) {
  //   return null;
  // }

  // For now, always return null since approval feature is not available yet
  return null;
};

export type ConfirmationRejectedProps = {
  children?: ReactNode;
};

export const ConfirmationRejected = ({
  children,
}: ConfirmationRejectedProps) => {
  const { approval, state } = useConfirmation();

  // TODO: Enable when AI SDK adds approval states
  // Only show when rejected and in response states
  // if (
  //   approval?.approved !== false ||
  //   (state !== "approval-responded" &&
  //     state !== "output-denied" &&
  //     state !== "output-available")
  // ) {
  //   return null;
  // }

  // For now, always return null since approval feature is not available yet
  return null;
};

export type ConfirmationActionsProps = ComponentProps<"div">;

export const ConfirmationActions = ({
  className,
  ...props
}: ConfirmationActionsProps) => {
  const { state } = useConfirmation();

  // TODO: Enable when AI SDK adds approval-requested state
  // Only show when approval is requested
  // if (state !== "approval-requested") {
  //   return null;
  // }

  // For now, always return null since approval feature is not available yet
  return null;
};

export type ConfirmationActionProps = ComponentProps<typeof Button>;

export const ConfirmationAction = (props: ConfirmationActionProps) => (
  <Button className="h-8 px-3 text-sm" type="button" {...props} />
);
