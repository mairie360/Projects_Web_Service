import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // MAIR-846: the project page writes `?project=…&tab=…` into the history; each test starts from `/`.
  window.history.replaceState(null, "", "/");
});
