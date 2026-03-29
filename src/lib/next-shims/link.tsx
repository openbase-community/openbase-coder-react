/**
 * Compatibility shim for next/link.
 *
 * Wraps react-router-dom's <Link> to match the Next.js NextLink API surface
 * used by agent-inbox (href prop → to prop).
 */

import { Link, type LinkProps } from "react-router-dom";
import React from "react";

type NextLinkProps = Omit<LinkProps, "to"> & {
  href: string;
  children?: React.ReactNode;
};

const NextLink = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  function NextLink({ href, ...rest }, ref) {
    return <Link ref={ref} to={href} {...rest} />;
  }
);

export default NextLink;
