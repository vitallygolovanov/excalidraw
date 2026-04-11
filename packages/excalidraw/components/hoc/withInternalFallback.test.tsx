import React from "react";

import { Excalidraw, MainMenu } from "../../index";
import { render, queryAllByTestId } from "../../tests/test-utils";

describe("Test internal component fallback rendering", () => {
  it("should render only one menu per excalidraw instance (custom menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (default menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two custom menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two default menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should keep desktop trigger slots isolated and ordered around the main menu", async () => {
    const { container, getByTestId } = await render(
      <Excalidraw>
        <MainMenu.DesktopTriggerBefore>
          <button data-testid="desktop-trigger-before">before</button>
        </MainMenu.DesktopTriggerBefore>
        <MainMenu>test</MainMenu>
        <MainMenu.DesktopTriggerAfter>
          <button data-testid="desktop-trigger-after">after</button>
        </MainMenu.DesktopTriggerAfter>
      </Excalidraw>,
    );

    const before = getByTestId(container, "desktop-trigger-before");
    const menu = getByTestId(container, "main-menu-trigger");
    const after = getByTestId(container, "desktop-trigger-after");

    expect(
      before.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      after.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });
});
