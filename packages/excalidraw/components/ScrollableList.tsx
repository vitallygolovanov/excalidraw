import clsx from "clsx";
import { Children } from "react";

import "./ScrollableList.scss";

interface ScrollableListProps {
  className?: string;
  placeholder: string;
  children: React.ReactNode;
}

export const ScrollableList = ({
  className,
  placeholder,
  children,
}: ScrollableListProps) => {
  const normalizedChildren = Children.toArray(children);
  const isEmpty = normalizedChildren.length === 0;

  return (
    <div className={clsx("ScrollableList__wrapper", className)} role="menu">
      {isEmpty ? <div className="empty">{placeholder}</div> : normalizedChildren}
    </div>
  );
};
