import React from "react";

import { MIME_TYPES } from "@excalidraw/common";

import { serializeLibraryAsJSON } from "../data/json";
import { t } from "../i18n";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { UI } from "./helpers/ui";
import { fireEvent, GlobalTestState, render, waitFor } from "./test-utils";

import type { LibraryItems } from "../types";

const { h } = window;

// Loaded after the package entry: importing the palette module first evaluates the actions before
// `DEFAULT_CATEGORIES` exists (circular import through the entry), which the host never does.
let CommandPalette: typeof import("../components/CommandPalette/CommandPalette").CommandPalette;
beforeAll(async () => {
  ({ CommandPalette } = await import("../components/CommandPalette/CommandPalette"));
});

// [fork:libraryEnabled] hosts that ship their own templates turn the library off.
describe("libraryEnabled", () => {
  const openElementContextMenu = () => {
    const rect = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
    API.setElements([rect]);
    API.setSelectedElements([rect]);
    fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
      button: 2,
      clientX: 10,
      clientY: 10,
    });
    const contextMenu = UI.queryContextMenu();
    expect(contextMenu).not.toBeNull();
    return contextMenu!;
  };

  const libraryItemsFixture = (): LibraryItems => [
    {
      id: "lib-item",
      status: "unpublished",
      created: 1,
      elements: [
        API.createElement({
          type: "rectangle",
          x: 0,
          y: 0,
          width: 20,
          height: 20,
        }),
      ],
    },
  ];

  const openCommandPalette = async () => {
    h.setState({ openDialog: { name: "commandPalette" } });
    await waitFor(() => {
      expect(document.querySelector(".command-palette-dialog")).not.toBeNull();
    });
    return [...document.querySelectorAll(".command-item .name")].map(
      (node) => node.textContent?.trim(),
    );
  };

  it("keeps every library surface by default", async () => {
    await render(
      <Excalidraw initialData={{ libraryItems: libraryItemsFixture() }}>
        <CommandPalette />
      </Excalidraw>,
    );

    expect(document.querySelector(".default-sidebar-trigger")).not.toBeNull();
    await waitFor(async () => {
      expect(await h.app.library.getLatestLibrary()).toHaveLength(1);
    });

    h.setState({ openSidebar: { name: "default", tab: "library" } });
    await waitFor(() => {
      expect(document.querySelector('[data-testid="library"]')).not.toBeNull();
    });

    expect(await openCommandPalette()).toContain(t("toolBar.library"));

    const contextMenu = openElementContextMenu();
    expect(
      contextMenu.querySelector('li[data-testid="addToLibrary"]'),
    ).not.toBeNull();
  });

  it("removes every library surface when false", async () => {
    await render(
      <Excalidraw
        libraryEnabled={false}
        initialData={{ libraryItems: libraryItemsFixture() }}
      >
        <CommandPalette />
      </Excalidraw>,
    );

    expect(document.querySelector(".default-sidebar-trigger")).toBeNull();
    expect(await h.app.library.getLatestLibrary()).toEqual([]);

    h.setState({ openSidebar: { name: "default", tab: "library" } });
    await waitFor(() => {
      expect(document.querySelector(".sidebar")).not.toBeNull();
    });
    expect(document.querySelector('[data-testid="library"]')).toBeNull();
    h.setState({ openSidebar: null });

    expect(await openCommandPalette()).not.toContain(t("toolBar.library"));
    h.setState({ openDialog: null });

    const contextMenu = openElementContextMenu();
    expect(
      contextMenu.querySelector('li[data-testid="addToLibrary"]'),
    ).toBeNull();
    // the neighbouring items are untouched
    expect(
      contextMenu.querySelector('li[data-testid="wrapSelectionInFrame"]'),
    ).not.toBeNull();
  });

  it("rejects a dropped .excalidrawlib file instead of importing it silently", async () => {
    await render(<Excalidraw libraryEnabled={false} />);

    await API.drop(
      new Blob([serializeLibraryAsJSON(libraryItemsFixture())], {
        type: MIME_TYPES.excalidrawlib,
      }),
    );

    await waitFor(() => {
      expect(h.state.errorMessage).toBe(t("errors.importLibraryError"));
    });
    expect(await h.app.library.getLatestLibrary()).toEqual([]);
  });
});
