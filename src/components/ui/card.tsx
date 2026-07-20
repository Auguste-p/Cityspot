import * as React from "react";

import { cn } from "./utils";

function Card({ className, onClick, onKeyDown, ...props }: React.ComponentProps<"div">) {
  // ponytail: Card doubles as a clickable list item in several places (PostCard, category
  // filters, map list). Making it keyboard-operable here fixes every call site at once
  // instead of re-adding role/tabIndex/onKeyDown wherever a Card gets an onClick.
  const interactiveProps = onClick
    ? {
        role: "button",
        tabIndex: 0,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
          }
        },
      }
    : { onKeyDown };

  return (
    // role/tabIndex/onKeyDown are added dynamically via interactiveProps above when onClick is set;
    // the linter can't see through the spread, but the keyboard path is covered by card.test.tsx.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        onClick && "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      onClick={onClick}
      {...interactiveProps}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    // content comes from the caller via {...props}.children; every call site provides text.
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h4
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
