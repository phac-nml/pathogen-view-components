import { Application } from "@hotwired/stimulus";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import AvatarController from "../../../app/assets/javascripts/pathogen_view_components/avatar_controller";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function createImage({ complete = false, naturalWidth = 0 } = {}) {
  const image = document.createElement("img");
  image.src = "/portrait.png";
  image.setAttribute("data-pathogen--avatar-target", "image");
  image.setAttribute("data-action", "load->pathogen--avatar#showImage error->pathogen--avatar#showFallback");
  Object.defineProperties(image, {
    complete: { configurable: true, value: complete },
    naturalWidth: { configurable: true, value: naturalWidth },
  });
  return image;
}

function appendAvatar(imageOptions) {
  const avatar = document.createElement("span");
  avatar.setAttribute("data-controller", "pathogen--avatar");
  avatar.setAttribute("role", "img");
  avatar.setAttribute("aria-label", "John Doe");
  const fallback = document.createElement("span");
  fallback.setAttribute("data-pathogen--avatar-target", "fallback");
  fallback.setAttribute("aria-hidden", "true");
  fallback.hidden = true;
  fallback.textContent = "JD";
  const image = createImage(imageOptions);
  avatar.append(fallback, image);
  document.body.append(avatar);
  return { avatar, image, fallback };
}

describe("avatar_controller", () => {
  let application;

  beforeEach(() => {
    application = Application.start();
    application.register("pathogen--avatar", AvatarController);
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    await settle();
    application.stop();
  });

  it("leaves a pending image visible and the fallback hidden", async () => {
    const { image, fallback } = appendAvatar();
    await settle();

    expect(image.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });

  it("shows the fallback on error without changing the accessible name", async () => {
    const { avatar, image, fallback } = appendAvatar();
    await settle();
    image.dispatchEvent(new Event("error"));

    expect(image.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
    expect(avatar).toHaveAttribute("aria-label", "John Doe");
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });

  it("restores the image on a subsequent successful load", async () => {
    const { image, fallback } = appendAvatar();
    await settle();
    image.dispatchEvent(new Event("error"));
    image.dispatchEvent(new Event("load"));

    expect(image.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });

  it("handles images that failed before the controller connected", async () => {
    const { image, fallback } = appendAvatar({ complete: true });
    await settle();

    expect(image.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
  });

  it("keeps successfully cached images visible", async () => {
    const { image, fallback } = appendAvatar({ complete: true, naturalWidth: 48 });
    await settle();

    expect(image.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });

  it("reconciles cached image replacements", async () => {
    const { image, fallback } = appendAvatar({ complete: true });
    await settle();
    const replacement = createImage({ complete: true, naturalWidth: 48 });
    image.replaceWith(replacement);
    await settle();

    expect(replacement.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);
  });

  it("reconciles fallback replacements when the failed image is retained", async () => {
    const { fallback } = appendAvatar({ complete: true });
    await settle();
    const replacement = fallback.cloneNode(true);
    replacement.hidden = true;
    fallback.replaceWith(replacement);
    await settle();

    expect(replacement.hidden).toBe(false);
  });

  it("removes event bindings on disconnect and reconciles on reconnect", async () => {
    const { avatar, image, fallback } = appendAvatar();
    await settle();
    avatar.remove();
    await settle();
    image.dispatchEvent(new Event("error"));

    expect(image.hidden).toBe(false);
    expect(fallback.hidden).toBe(true);

    Object.defineProperty(image, "complete", { value: true });
    document.body.append(avatar);
    await settle();

    expect(image.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
  });

  it("tolerates missing targets during fragment updates", async () => {
    const { avatar, image, fallback } = appendAvatar();
    await settle();
    const controller = application.getControllerForElementAndIdentifier(avatar, "pathogen--avatar");
    fallback.remove();

    expect(() => controller.showFallback()).not.toThrow();
    image.remove();
    expect(() => controller.showImage()).not.toThrow();
  });

  it("reconciles an image added after its fallback target", async () => {
    const { avatar, image, fallback } = appendAvatar({ complete: true });
    image.remove();
    await settle();
    avatar.append(image);
    await settle();

    expect(image.hidden).toBe(true);
    expect(fallback.hidden).toBe(false);
  });
});
