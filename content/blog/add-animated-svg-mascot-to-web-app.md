---
title: "How to Add an Animated SVG Mascot to a Web App"
description: "Export a mascot pose from MascotAI, embed the animated SVG in your web app, and serve a still frame for visitors who prefer reduced motion."
date: "2026-11-23"
category: guide
tags:
  - animated SVG
  - app mascot
  - web development
  - reduced motion
---

To add an animated SVG mascot to a web app, export the pose you need, host the SVG with your other images, and embed it with `<picture>`. Use a still image by default and select the animated file when the browser reports no reduced-motion preference. Start with one screen, such as a wave on your welcome page.

## Download the pose you want to use

1. Open a mascot you own from your MascotAI library. Choose a gesture and set the theme and visible parts the way you want them to look in your app.
2. Check that **Motion** reads **Playing**. Under **Pose format**, select **SVG**, then choose **Download SVG**. The file includes the selected theme and parts. For several gestures, **Download pack** gives you a ZIP with an SVG for each pose.
3. Make a single-frame PNG of the same pose in an image editor. Use the same aspect ratio so swapping between the animation and still keeps the layout stable.

The [Lyra example studio](/studio/lyra) lets you explore gestures before signing up. You can also preview packs in the [animated SVG mascot marketplace](/marketplace). Downloads come from the library studio once you own a mascot.

## Embed the animation with a still fallback

Save the exported SVG as `mascot-wave.svg` and the still frame as `mascot-still.png`. Put both files beside your HTML page, then paste this into the page. In a Next.js app, placing both files in `public` makes them available at root-relative paths such as `/mascot-wave.svg`.

```html
<picture>
  <source
    media="(prefers-reduced-motion: no-preference)"
    srcset="./mascot-wave.svg"
    type="image/svg+xml"
  >
  <img src="./mascot-still.png" width="168" height="208" alt="">
</picture>
```

The empty `alt` suits a decorative mascot beside a welcome heading. If the character conveys information, put the status in visible text so it remains clear with either image. If a nonessential animation plays automatically for more than five seconds alongside other content, give people a way to pause, stop, or hide it. A short, single-play welcome gesture avoids a continuous loop. [MDN picture element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture) · [W3C pause, stop, hide guidance](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

## Check that the pose works in your app

Test the actual page with reduced motion turned both on and off. Verify that the animation plays in its intended browser and that the still appears at the same size. If nothing moves, check that you exported with **Playing** enabled and that the chosen pose has motion.

Embedded CSS keyframes and declarative SVG animation elements such as `<animateTransform>` can play inside an SVG image. In this context browsers disable scripts, external stylesheet loads, and interaction inside the image. To show different poses for loading or success, let your app choose a different image for each state. [MDN SVG image restrictions](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) · [W3C SVG processing modes](https://www.w3.org/TR/SVG2/conform.html#processing-modes)

This HTML works in a browser, including mobile browsers. In a native iOS or Android app, test the image or animation component your app uses. If the SVG shows up as a still, try an APNG export or use animated WebP when both your export browser and native component support it.
