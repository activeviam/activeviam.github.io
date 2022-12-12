# /modules/hooks 

[Parent directory](../__index__.md)


## Table of contents 
* [fuzzyTimer.md](#__autogen_28__)
* [notification.md](#__autogen_29__)
* [overlayContainer.md](#__autogen_30__)
* [windowSize.md](#__autogen_31__)


## src/hooks/fuzzyTimer.ts <a id="__autogen_28__"></a>

This hook provides an automatically updated elapsed time counter, as well as a function for its text representation.
This timer has a fixed update lag.

## src/hooks/notification.ts <a id="__autogen_29__"></a>

This hook is a wrapper around the `useNotificationContext()` hook for displaying error notifications.

## src/hooks/overlayContainer.tsx <a id="__autogen_30__"></a>

This module exports the wrapper component `OverlayContainer` and the hook to access it `useOverlayContainer()`. The
purpose of this module is to allow work with `Overlay` inside SVG.

## src/hooks/windowSize.ts <a id="__autogen_31__"></a>

This hook allows you to get the dimensions of the window in the form of react variables.