import React from "react";

import { composeEventHandlers } from "@excalidraw/common";

import { useTunnels } from "../../context/tunnels";
import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import { useDevice, useExcalidrawSetAppState } from "../App";
import { UserList } from "../UserList";
import DropdownMenu from "../dropdownMenu/DropdownMenu";
import { withInternalFallback } from "../hoc/withInternalFallback";
import { HamburgerMenuIcon } from "../icons";

import * as DefaultItems from "./DefaultItems";

const MobileAppToolbarBefore = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { MainMenuMobileAppToolbarBeforeTunnel } = useTunnels();

  return (
    <MainMenuMobileAppToolbarBeforeTunnel.In>
      {children}
    </MainMenuMobileAppToolbarBeforeTunnel.In>
  );
};
MobileAppToolbarBefore.displayName = "MainMenu.MobileAppToolbarBefore";

const MobileAppToolbarAfter = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { MainMenuMobileAppToolbarAfterTunnel } = useTunnels();

  return (
    <MainMenuMobileAppToolbarAfterTunnel.In>
      {children}
    </MainMenuMobileAppToolbarAfterTunnel.In>
  );
};
MobileAppToolbarAfter.displayName = "MainMenu.MobileAppToolbarAfter";

const DesktopTriggerBefore = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { MainMenuDesktopTriggerBeforeTunnel } = useTunnels();

  return (
    <MainMenuDesktopTriggerBeforeTunnel.In>
      {children}
    </MainMenuDesktopTriggerBeforeTunnel.In>
  );
};
DesktopTriggerBefore.displayName = "MainMenu.DesktopTriggerBefore";

const DesktopTriggerAfter = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { MainMenuDesktopTriggerAfterTunnel } = useTunnels();

  return (
    <MainMenuDesktopTriggerAfterTunnel.In>
      {children}
    </MainMenuDesktopTriggerAfterTunnel.In>
  );
};
DesktopTriggerAfter.displayName = "MainMenu.DesktopTriggerAfter";

const MainMenu = Object.assign(
  withInternalFallback(
    "MainMenu",
    ({
      children,
      onSelect,
    }: {
      children?: React.ReactNode;
      /**
       * Called when any menu item is selected (clicked on).
       */
      onSelect?: (event: Event) => void;
    }) => {
      const { MainMenuTunnel } = useTunnels();
      const device = useDevice();
      const appState = useUIAppState();
      const setAppState = useExcalidrawSetAppState();
      const onClickOutside = device.editor.isMobile
        ? undefined
        : () => setAppState({ openMenu: null });

      return (
        <MainMenuTunnel.In>
          <DropdownMenu open={appState.openMenu === "canvas"}>
            <DropdownMenu.Trigger
              onToggle={() => {
                setAppState({
                  openMenu: appState.openMenu === "canvas" ? null : "canvas",
                });
              }}
              data-testid="main-menu-trigger"
              className="main-menu-trigger"
            >
              {HamburgerMenuIcon}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              onClickOutside={onClickOutside}
              onSelect={composeEventHandlers(onSelect, () => {
                setAppState({ openMenu: null });
              })}
            >
              {children}
              {device.editor.isMobile && appState.collaborators.size > 0 && (
                <fieldset className="UserList-Wrapper">
                  <legend>{t("labels.collaborators")}</legend>
                  <UserList
                    mobile={true}
                    collaborators={appState.collaborators}
                    userToFollow={appState.userToFollow?.socketId || null}
                  />
                </fieldset>
              )}
            </DropdownMenu.Content>
          </DropdownMenu>
        </MainMenuTunnel.In>
      );
    },
  ),
  {
    Trigger: DropdownMenu.Trigger,
    DesktopTriggerBefore,
    DesktopTriggerAfter,
    MobileAppToolbarBefore,
    MobileAppToolbarAfter,
    Item: DropdownMenu.Item,
    ItemLink: DropdownMenu.ItemLink,
    ItemCustom: DropdownMenu.ItemCustom,
    Group: DropdownMenu.Group,
    Separator: DropdownMenu.Separator,
    DefaultItems,
  },
);

export default MainMenu;
