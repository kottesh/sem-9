---
title: "Image in Software User Interface Design"
subtitle: "Guidelines for meaningful, usable, and accessible interface images"
author: "Software User Interface Design"
date: ""
theme: Madrid
colortheme: default
fontsize: 10pt
aspectratio: 169
---

# Context and Scope

## Topic: Image in SUID

**Core idea:** In user interface design, an image is not decoration first; it is a **communication element**.

Images can:

- support understanding and recall,
- make abstract information concrete,
- guide navigation,
- communicate object appearance,
- improve accessibility when used correctly,
- create confusion, delay, and distraction when used carelessly.

**Reference base:** Wilbert O. Galitz, *The Essential Guide to User Interface Design*, 3rd ed., Step 11: “Create Meaningful Graphics, Icons, and Images,” especially the section **Images**, pp. 671--675.

## Flow of the Presentation

1. Why images matter in interface design
2. Where images fit among graphics and multimedia
3. Purposes and types of interface images
4. Design principles for images
5. Image size, loading, and performance
6. Image color and file format decisions
7. Accessibility and internationalization
8. Related image techniques: image maps and photographs
9. Practical checklist and conclusion

# Why Images Matter

## Images as Interface Communication

Images are part of the visible language of an interface.

A good image can:

- communicate faster than text in some situations,
- make an interface easier to learn,
- reduce dependence on language,
- help users recognize objects and actions,
- support navigation through visual cues.

However, a poor image can:

- mislead the user,
- increase page clutter,
- slow download and response time,
- reduce accessibility,
- distract from the main task.

## Key Principle

> Use images only when they serve a clear user-interface purpose.

Images should **supplement** the interface message, not dominate it.

They should be selected or designed according to:

- user goals,
- task context,
- recognizability,
- legibility,
- accessibility,
- performance constraints.

# Images within Graphics and Multimedia

## From Graphics to Images

In SUID, images are part of a broader set of graphical and multimedia elements.

| Element | Main purpose in UI | Example |
|---|---|---|
| Icons | Represent objects, actions, status, warnings | Save, delete, warning |
| Graphics | Supplement text and support navigation | Site overview, category illustration |
| Images | Convey visual meaning and recognition | Product image, navigation image |
| Photographs | Show realistic appearance | Person, product, location |
| Diagrams | Show structure, relationship, or process | Flowchart, organization chart |
| Video | Show motion or change over time | Demonstration, tutorial |

## Purposes of Graphics Containing Images

Galitz classifies graphics on Web/interface pages by purpose:

| Purpose | Meaning | UI example |
|---|---|---|
| Navigational | Identifies links or routes | Image button leading to a section |
| Representational | Shows something mentioned in text | Product picture beside description |
| Organizational | Shows relationships among items | Site map or category map |
| Explanative | Explains how something works | Diagram of a process |
| Decorative | Adds visual appeal or emphasis | Background pattern or separator |

**Important:** Decorative images must not interfere with task performance.

# Design Principles for Images

## Guideline 1: Ensure Images Convey Intended Messages

Users and designers may interpret the same image differently.

- Users often prefer **familiar** images.
- Designers may prefer **artistic** or visually impressive images.
- The best image is the one that communicates correctly to the target users.

**Design implication:** Test images with real users whenever possible.

**Questions to ask:**

- What should the image communicate?
- Do users understand it without explanation?
- Does it support the task?
- Could text communicate the same thing more clearly?

## Guideline 2: Use Standard Images

Use standard or already-tested images whenever possible.

Benefits:

- improves consistency,
- reduces learning effort,
- supports user expectations,
- avoids unnecessary invention,
- reduces interpretation errors.

Sources of standard images may include:

- platform UI guidelines,
- organizational design systems,
- industry standards,
- ISO and other standards bodies,
- existing application conventions.

## Guideline 3: Emulate Real-World Objects

Images that resemble real-world objects are easier to understand.

Examples:

| Interface image | Real-world metaphor | Why it works |
|---|---|---|
| Button-like image | Physical button | Users understand it can be pressed |
| Folder image | Office folder | Suggests storage or grouping |
| Shopping cart image | Store cart | Suggests items selected for purchase |
| Trash bin image | Waste container | Suggests deletion or removal |

**Caution:** A real-world metaphor must be familiar to the target user group.

## Guideline 4: Use Images Consistently

An image should have **one meaning** throughout the system.

Avoid:

- different images for the same meaning,
- same image for different meanings,
- inconsistent style across pages,
- changing interactive behavior of similar-looking images.

Consistency helps users build a reliable mental model of the interface.

## Guideline 5: Produce Legible Images

An image must be easy to identify.

Legibility depends on:

- contrast with background,
- image complexity,
- image size,
- viewing distance,
- screen resolution,
- color choices,
- amount of detail.

**Rule of thumb:** Use the minimum amount of detail needed for recognition.

## Visual Placeholder: Legibility and Detail

![Figure 11.5: Avoid excessive detail in icon design. Source: Galitz, Step 11, printed p. 662.](suid_extracted_images/selected/figure-11-5-avoid-excessive-detail.png)

## Guideline 6: Provide Descriptive Text or Labels

Images are not always self-explanatory.

Provide:

- visible labels for important images,
- alternate text for screen readers,
- captions where useful,
- longer descriptions for complex images.

This improves:

- comprehension,
- learning,
- recall,
- accessibility,
- usability when images fail to load.

## Descriptive Text: Why It Matters

Alternate/descriptive text helps different users:

| User situation | Benefit of descriptive text |
|---|---|
| Vision-impaired user | Screen reader can communicate image content |
| Slow connection | User understands image before it fully loads |
| Images disabled | Interface remains meaningful |
| Search/indexing | Text content is easier to process than images |
| New user | Label reduces guessing and errors |

# Navigational and Decorative Images

## Distinguish Navigational Images from Decorative Images

Users must know which images are interactive.

A navigational image should clearly look clickable.

Possible cues:

- raised or button-like appearance,
- underlined label near the image,
- clear hover/focus state,
- consistent placement in navigation area,
- meaningful alternate text.

Avoid forcing users to move the pointer over every image just to discover what is clickable.

## Navigational vs Decorative Images

| Aspect | Navigational image | Decorative image |
|---|---|---|
| Purpose | Takes user to content or performs action | Adds visual appeal/emphasis |
| Interaction | Clickable or selectable | Usually not clickable |
| Required cue | Must visibly indicate interactivity | Should not look like a control |
| Accessibility | Needs meaningful alt text | May use empty alt text if purely decorative |
| Risk | Hidden links, missed actions | Distraction, clutter |

## Common Problem: Image Looking Like an Advertisement

Important functional images should not look like:

- banner ads,
- irrelevant decorations,
- promotional graphics,
- visual noise.

If users think a useful image is an advertisement, they may ignore it.

**Design goal:** Important images should look integrated with the interface and task.

# Minimizing Images

## Guideline 7: Minimize the Number of Images

More images usually mean:

- slower loading,
- more visual clutter,
- more cognitive effort,
- more competition for attention.

Use images only when they:

- add value,
- improve clarity,
- support recognition,
- help navigation,
- explain what text cannot explain efficiently.

## Guideline 8: Minimize Image Size

Large images increase waiting time and reduce responsiveness.

Galitz gives classic Web-performance targets:

| Image quantity | Recommended limit in Galitz |
|---|---:|
| Single image | about 5 KB |
| Total page images | about 20 KB |

These numbers reflect older Web constraints, but the principle remains valid:

> Keep images as small as possible while preserving necessary quality.

## Practical Modern Interpretation

Even with faster networks, image size still matters because of:

- mobile data limits,
- low-bandwidth users,
- server cost,
- page load performance,
- energy usage,
- user patience.

Modern practice:

- compress images,
- use responsive image sizes,
- lazy-load below-fold images,
- use thumbnails for previews,
- avoid oversized source files.

## Guideline 9: Use Thumbnails

A **thumbnail** is a small, low-size preview of a larger image.

Use thumbnails when:

- many images must be shown,
- users may not need every full-size image,
- full images are large,
- quick scanning is important.

Best practice:

- show thumbnail first,
- link to high-quality full image,
- inform user about the full image size if relevant.

# Image Animation and Extraneous Images

## Guideline 10: Minimize Image Animation

Animated images should be used only when they serve a real purpose.

Useful purposes may include:

- showing change over time,
- demonstrating a process,
- giving meaningful feedback,
- attracting attention to a critical event.

Avoid animation for mere decoration because it can:

- distract users,
- slow loading,
- annoy users,
- create accessibility problems.

## Avoid Extraneous or Gratuitous Images

A gratuitous image is an image that does not support the interface goal.

Problems caused:

- visual clutter,
- slower interaction,
- confusion about what matters,
- reduced professionalism,
- poor accessibility.

**Test:** If removing the image does not reduce understanding or task success, the image may not be necessary.

# Color and File Format

## Guideline 11: Minimize Number of Colors

Reducing colors can reduce file size.

However:

- too few colors may degrade the image,
- rich photographic images need more color detail,
- flat graphics may work well with fewer colors.

**Design goal:** retain enough quality for recognition while reducing unnecessary file weight.

## Guideline 12: Choose the Appropriate Format

Galitz emphasizes two common Web formats of the time:

| Format | Best for | Strength | Limitation |
|---|---|---|---|
| GIF | Flat colors, simple graphics, backgrounds | Small files, supports simple animation | Limited to 256 colors |
| JPEG | Photographs and rich tonal variation | Good for complex color images | Can introduce artifacts; usually larger than GIF for flat graphics |

## Modern Format Extension

For current UI work, also consider:

| Format | Best for | Notes |
|---|---|---|
| PNG | UI graphics, transparency, screenshots | Lossless, often larger than JPEG |
| SVG | Icons, logos, diagrams | Scalable vector format; excellent for resolution independence |
| WebP | Web images, photos, graphics | Good compression; broad browser support |
| AVIF | High-compression modern images | Very small files but compatibility must be checked |

Use the format that best matches the image purpose and platform support.

## GIF vs JPEG: Classic Decision Table

| Image type | Prefer GIF | Prefer JPEG |
|---|---:|---:|
| Simple line drawing | Yes | No |
| Flat-color graphic | Yes | No |
| Logo with few colors | Yes / PNG / SVG | No |
| Photograph | No | Yes |
| Smooth color gradients | Usually no | Yes |
| Simple animation | Yes | No |
| Detailed natural scene | No | Yes |

# Layout and Placement

## Guideline 13: Limit Large Images Above the Page Fold

Do not fill the first visible screen only with a large image.

Why?

- Users may not realize more content exists below.
- Important text may be hidden.
- The page may appear empty or purely promotional.
- Users may not scroll.

Better approach:

- combine image with meaningful heading/text,
- keep primary task visible,
- provide clear scroll cues,
- place large supporting images lower on the page or behind a thumbnail.

## Guideline 14: Use Background Images Sparingly

Background images can harm usability.

Problems:

- reduce text readability,
- slow loading,
- create visual noise,
- distract from content,
- cause contrast/accessibility failures.

If background images are used:

- keep them simple,
- use low contrast behind text,
- ensure strong text-background contrast,
- avoid busy patterns,
- test on different displays.

## Guideline 15: Reuse Images

Repeated images can be cached by browsers or applications.

Benefits:

- faster loading after first use,
- visual consistency,
- reduced design effort,
- easier maintenance.

Examples:

- repeated navigation icons,
- consistent section markers,
- common product placeholders,
- standard status illustrations.

# Accessibility

## Images and Accessibility

Screen-review utilities cannot directly reveal images to visually impaired users.

Therefore, important images need text equivalents.

| Image type | Accessibility treatment |
|---|---|
| Informational image | Provide meaningful alt text |
| Complex diagram | Provide short alt text + long description |
| Navigational image | Describe destination/action |
| Decorative image | Empty alt text may be appropriate |
| Image with embedded text | Avoid when possible; provide equivalent text |

## Long Descriptions

Some images cannot be explained in one short phrase.

Examples:

- charts,
- diagrams,
- maps,
- infographics,
- screenshots with many elements.

For these, provide:

- short alt text identifying the image,
- nearby explanation or caption,
- separate long-description page if necessary.

## Accessibility Placeholder

![Web Page Accessibility Design: image accessibility guidelines. Source: Galitz, Step 10, printed p. 642.](suid_extracted_images/selected/accessibility-images-guidelines-p642.png)

# Internationalization

## Image Internationalization

Images may reduce the need for translation, but they are not automatically universal.

Consider:

- cultural meanings,
- religious symbols,
- gestures,
- color associations,
- number meanings,
- social norms,
- reading direction,
- local objects and metaphors.

An image familiar in one culture may be meaningless or offensive in another.

## Internationalization Checklist

| Question | Why it matters |
|---|---|
| Is the object familiar to the target culture? | Recognition depends on user experience |
| Does the image contain text? | Text requires translation/localization |
| Does the color have cultural meaning? | Colors may signal different emotions or meanings |
| Does the gesture/symbol have local implications? | Gestures can be offensive or misunderstood |
| Is the metaphor universal? | Some metaphors are culture-specific |

# Image Maps

## What Is an Image Map?

An **image map** is a single image divided into clickable regions, where each region links to different content.

Use image maps mainly for navigation when the graphical structure itself is meaningful.

Examples:

- geographic map with clickable regions,
- building floor plan,
- product parts diagram,
- visual site overview.

## Image Maps: Advantages and Disadvantages

| Advantages | Disadvantages |
|---|---|
| Can match the user’s mental model | Consumes significant screen space |
| Can show meaningful structure | Hot spots may not be obvious |
| May aid conceptualization | Selected location may not be clear |
| Can be faster than many separate images | Search and accessibility issues may occur |

## Image Map Guidelines

Use image maps with caution.

If used:

- make clickable boundaries obvious,
- provide strong visual cues,
- show selected/visited states where possible,
- provide equivalent text links,
- ensure keyboard accessibility,
- provide alt text for regions,
- avoid making users guess where to click.

# Photographs and Pictures

## When to Use Photographs/Pictures

Use photographs when every visible aspect of the object is relevant.

Good uses:

- product appearance,
- people or places,
- physical damage evidence,
- real-world examples,
- visual identification.

Photographs communicate details that are hard to describe textually.

## Photograph Guidelines

- Prefer JPEG or modern photographic formats such as WebP/AVIF where supported.
- On the initial page, use a small version or thumbnail.
- Link to a larger, high-quality version if needed.
- Show the most relevant detail clearly.
- Use close-up shots with clean backgrounds.
- Avoid cluttered scenes with too many people or objects.
- Use people photographs carefully; test whether they increase trust or distract.

## Visual Placeholder: Photo Thumbnail Pattern

![Photographs/Pictures guidelines: thumbnail and larger-photo strategy. Source: Galitz, Step 11, printed p. 676.](suid_extracted_images/selected/photographs-pictures-guidelines-p676.png)

# Practical Design Application

## Example: Product Listing Page

| Design decision | Good image practice |
|---|---|
| Product image | Use clear thumbnail with link to larger view |
| Image size | Compress and serve responsive sizes |
| Label | Provide product name below image |
| Alt text | Describe product, not “image1.jpg” |
| Navigation | Make clickable area obvious |
| Background | Keep plain to preserve product visibility |
| Internationalization | Avoid culturally specific symbols unless localized |

## Example: Learning Management System

For a course page, images may be used to:

- identify modules,
- show diagrams of concepts,
- provide screenshots of software steps,
- illustrate examples,
- support memory through visual association.

But images should not:

- replace essential instructions,
- make pages heavy,
- distract from learning tasks,
- lack descriptions for accessibility.

# Summary Tables

## Image Design Do's and Don'ts

| Do | Don't |
|---|---|
| Use images with clear purpose | Add images only for decoration |
| Use familiar/standard images | Invent unfamiliar visual language unnecessarily |
| Provide labels and alt text | Assume everyone can see or understand the image |
| Keep images small and optimized | Upload oversized images directly |
| Distinguish clickable images | Make users guess what is interactive |
| Use thumbnails for large images | Force large downloads immediately |
| Test with users | Rely only on designer preference |

## Complete Image Checklist

Before finalizing an interface image, verify:

- [ ] The image has a clear purpose.
- [ ] It conveys the intended message.
- [ ] It is familiar to target users.
- [ ] It is legible at actual display size.
- [ ] It is consistent with other interface images.
- [ ] It has descriptive text, label, or alt text.
- [ ] It is optimized for file size.
- [ ] The file format is appropriate.
- [ ] It does not hide important content above the fold.
- [ ] It does not reduce text readability.
- [ ] It works for accessibility needs.
- [ ] It is suitable for international users.

# Key Takeaways

## Final Message

Images are powerful only when they improve communication and task performance.

A good UI image is:

- meaningful,
- familiar,
- legible,
- consistent,
- accessible,
- efficiently loaded,
- culturally appropriate,
- supportive of the user’s task.

**Conclusion:** In Software User Interface Design, image design is not about making screens look rich; it is about making interaction clearer, faster, and more usable.

# References

## References

- Galitz, W. O. (2007). *The Essential Guide to User Interface Design: An Introduction to GUI Design Principles and Techniques* (3rd ed.). Wiley.
- Galitz, Step 11: “Create Meaningful Graphics, Icons, and Images,” especially “Graphics,” “Images,” “Image Maps,” and “Photographs/Pictures,” pp. 669--677.
- Galitz, Step 10: “Web Page Accessibility Design,” especially image accessibility guidelines, pp. 642--644.
