import React from "react";
export default function PreviewLink({
  prefetch,
  ...props
}: React.ComponentProps<"a"> & { prefetch?: boolean }) {
  void prefetch;
  return <a {...props} />;
}
