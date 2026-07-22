---
title: "Menu Design in Human–Computer Interaction"
author: "Assignment"
date: ""
geometry: margin=1in
fontsize: 12pt
linestretch: 1.35
toc: true
toc-depth: 2
numbersections: true
header-includes:
  - \usepackage{enumitem}
  - \setlist{itemsep=4pt,topsep=5pt}
---

# Introduction

A **menu** is a list of options, commands, or alternatives displayed by a computer system from which the user can make a selection. Menus are among the most common interaction methods used in software applications, websites, mobile apps, ATMs, ticket-booking machines, and other interactive systems.

Menus reduce the need for users to remember commands because the available choices are displayed on the screen. A well-designed menu helps users understand the system, locate functions quickly, navigate between screens, and complete tasks with fewer errors. A poorly designed menu, on the other hand, may contain confusing labels, too many options, unnecessary levels, or inconsistent navigation.

The important aspects of menu design are discussed below.

# Structures of Menus (3 Marks)

The **structure of a menu** refers to the way in which its options are arranged and the relationship between different menu screens. The structure should be selected according to the number of options, the complexity of the system, and the needs of users.

## Single-Level or Flat Menu

A single-level menu presents all available options together on one screen. The user can directly select the required option without opening another menu. This structure is suitable when the system contains only a small number of choices.

**Example:** A simple text application may display *Create Document, Open Document, Save Document, Print Document,* and *Exit* on the same screen.

**Advantages:**

- It is easy to learn and operate.
- It requires fewer user actions.
- All options are immediately visible.
- It is suitable for beginners.

**Limitation:** A flat menu is not suitable for complex applications containing hundreds of commands because the screen can become crowded and difficult to scan.

## Linear or Sequential Menu

In a linear menu, users move through a series of screens in a fixed order. A choice made on one screen leads to the next step in the sequence. It guides users through a task and reduces the chance of missing important information.

This structure is commonly used in software installation wizards, online forms, ATM transactions, booking systems, and online shopping checkouts. Users should be allowed to return to a previous step to review information or correct mistakes.

**Example:** An online purchase may follow this sequence:

> Select Product → Add Address → Choose Payment Method → Review Order → Confirm Purchase

## Hierarchical or Tree-Structured Menu

A hierarchical menu organizes choices into different levels. The first menu contains broad categories, and selecting a category opens a submenu containing more specific choices. It is called a tree structure because the main menu acts like the root, while its submenus form branches.

**Example:**

- **File**
  - New
  - Open
  - Save
  - Print
- **Edit**
  - Cut
  - Copy
  - Paste
  - Find
- **View**
  - Zoom
  - Full Screen
  - Layout

Hierarchical menus are useful for complex systems because they divide many commands into manageable groups. However, the hierarchy should not be too deep. Important options should normally be reachable within two or three levels.

## Network or Connected Menu

In a network structure, one menu can be connected to several other menus, and users may reach the same destination through different paths. This structure provides flexibility but must use consistent links so that users do not become lost.

**Example:** On a shopping website, a product can be reached through the search bar, product categories, recommendations, previous orders, or a wish list.

## Cyclic Menu

In a cyclic menu, the last option or screen connects back to the first. Users can repeatedly move through the available choices. Such menus are often used in digital watches, television settings, music players, and small electronic devices.

**Example:** Repeatedly pressing a *Mode* button on a digital watch may cycle through *Clock → Alarm → Timer → Settings → Clock*.

# Functions of Menus (3 Marks)

Menus perform several important functions in an interactive system.

## Providing Access to Commands

The primary function of a menu is to show the commands available to the user. Instead of memorizing and typing a command, the user can select it from a visible list.

**Example:** A word processor provides commands such as *New, Open, Save, Print, Copy,* and *Paste*.

## Supporting Navigation

Menus allow users to move between different sections, pages, and screens. A navigation menu should help users answer three questions: **Where am I now? Where can I go from here? How can I return to the previous page?**

**Example:** A website menu may contain *Home, Products, Services, About Us,* and *Contact Us*.

## Organizing System Features

A large application may contain many commands. Menus organize these commands into meaningful groups. File-management commands may be placed under *File*, while text-modification commands may be placed under *Edit*.

Logical organization makes commands easier to find, reduces visual clutter, helps users understand the system, and improves task-completion speed.

## Reducing Memory Load

Menus support **recognition rather than recall**. Recognition means identifying a visible option, whereas recall means remembering a command without assistance.

**Example:** It is easier for a user to recognize *Print* in a menu than to remember a special printing command and its exact syntax.

## Guiding Users

Menus communicate what actions are currently possible. If a command cannot be used at a particular time, it can be displayed in a disabled or greyed-out form. This prevents invalid actions and also teaches users about the conditions required for a command.

**Example:** The *Paste* command may be disabled when no content has been copied to the clipboard.

## Preventing Errors

Well-designed menus reduce typing mistakes and prevent users from entering invalid commands. Confirmation messages can also be provided for dangerous operations such as deleting a file, cancelling a booking, formatting a drive, or making an online payment.

**Example:** After a user selects *Delete Account*, the system may ask, “Are you sure you want to permanently delete your account?”

# Contents of Menus (3 Marks)

The contents of a menu include not only command labels but also visual and informational elements that explain the behaviour and current state of each item.

## Menu Titles

Every menu should have a meaningful title that describes its purpose. Clear titles help users predict the options contained within the menu.

**Examples:** *File, Edit, View, Settings, Help,* and *Payment Options*.

## Command Items

Command items perform actions when selected. Their labels should clearly indicate the result of selecting them.

**Examples:** *Save, Print, Copy, Refresh, Delete,* and *Log Out*.

## Navigation Items

Navigation items take users to another page, screen, or menu level. They should be placed consistently throughout the interface.

**Examples:** *Home, Next, Previous, Back, Dashboard,* and *View Profile*.

## Submenu Indicators

Some menu items open additional choices instead of performing an immediate action. Such items are normally marked with an arrow or another visual indicator.

**Example:**

- **Export →**
  - PDF
  - Word document
  - Image
  - Plain text

## Check Boxes and Radio Buttons

A **check box** is used when users may select more than one independent option. A **radio button** is used when only one option can be selected from a group. These controls also show the system's current state.

**Examples:** A View menu may contain check boxes for *Show Toolbar* and *Show Status Bar*. Display settings may contain radio buttons for *Small, Medium,* and *Large* text.

## Icons

Icons are graphical symbols representing menu commands. They can make frequently used commands easier to identify. However, unfamiliar icons should be accompanied by text labels or tooltips.

**Examples:** A printer represents *Print*, a magnifying glass represents *Search*, and a dustbin represents *Delete*.

## Keyboard Shortcuts

Menus may display keyboard shortcuts next to commands. Shortcuts improve efficiency for experienced users, while the visible menu continues to support beginners.

**Examples:** *Copy—Ctrl+C, Paste—Ctrl+V, Save—Ctrl+S,* and *Print—Ctrl+P*.

## Disabled Items and Separators

Unavailable commands are usually displayed in grey. They may remain visible to show that the feature exists but is temporarily unavailable. Separators—lines or extra spaces—divide related command groups.

**Example:** In a File menu, *Save* and *Print* may form one group, while *Close* and *Exit* form another group separated by a line.

# Formatting and Phrasing of Menus (6 Marks)

Formatting refers to the visual presentation of menu items, while phrasing refers to the words used in menu labels. Both are essential for creating menus that are understandable, efficient, and visually consistent.

## Use Clear and Familiar Terms

Menu labels should use words familiar to their intended users. Unnecessary technical terms, abbreviations, and organizational jargon should be avoided.

**Examples:** Use *Help* instead of *Assistance Facility*, *Delete Account* instead of *Terminate User Entity*, and *Payment History* instead of *Monetary Transaction Archive*.

## Keep Menu Labels Short

Menu labels should be concise but meaningful. Long sentences take more time to read and make a menu unnecessarily wide. This is especially important on mobile devices and small screens.

**Example:** Prefer *Print Document* to *Click Here to Print the Current Document*.

## Begin Commands with Action Words

Commands should generally begin with verbs because they represent actions. Noun labels may be used for destinations such as *Home, Profile,* and *Settings*.

**Examples:** *Create Account, Upload File, Send Message, Change Password,* and *Download Report*.

## Maintain Grammatical Consistency

Items within the same menu should follow the same grammatical pattern. Consistency makes them easier to read and gives the interface a professional appearance.

**Inconsistent:** *Creating a file, Open, File saving,* and *Printing*.

**Consistent:** *Create File, Open File, Save File,* and *Print File*.

## Use Consistent Capitalization

Capitalization should follow one style throughout the interface. Common styles are title case (*Change Password*) and sentence case (*Change password*). Sentence case is often easier to read when labels contain several words. All capital letters should usually be avoided because they are harder to scan.

**Example:** Do not mix *CHANGE PASSWORD*, *Edit profile,* and *View Orders* in the same menu. Select one capitalization style and apply it consistently.

## Arrange Items in a Logical Order

Menu items should be ordered according to user expectations. Common ordering methods include:

- **Frequency of use:** Place frequently used items first.
- **Sequence of use:** Follow the normal order of steps in a task.
- **Alphabetical order:** Useful for long lists without a natural sequence.
- **Importance:** Place important choices in easily visible positions.

**Example:** An ATM may place *Cash Withdrawal* before less frequently used services because withdrawal is a common operation.

## Group Related Items

Commands that perform related functions should be placed together. Groups may be separated with spacing, divider lines, or headings. Grouping helps users scan the menu and understand relationships between commands.

**Example:**

```text
New
Open
Save
------------
Print
Export
------------
Close
Exit
```

## Maintain Visual Consistency

The same font, size, colour scheme, alignment, and spacing should be used across menus. Similar items should look and behave similarly. Excessive decoration, fonts, or colours distract users from the commands, so visual emphasis should be reserved for important information.

**Example:** If all main navigation labels use 16-point bold text, one ordinary item should not suddenly appear in an unrelated font and colour.

## Use Proper Alignment and Spacing

Menu labels are usually left-aligned because this makes them easy to scan. Icons should be placed in one column, labels in another, and keyboard shortcuts in a separate aligned column. There should be sufficient space between items to prevent accidental selection, particularly on touchscreens.

**Example:** In a desktop menu, the icons may be aligned on the left and shortcuts such as *Ctrl+S* aligned on the right. On a phone, each option should have a sufficiently large touch area.

## Indicate Destructive Commands Clearly

Destructive commands such as *Delete Account, Remove File,* and *Cancel Booking* should be clearly worded. Vague terms such as *Proceed* or *Continue* should not be used when an action has serious consequences. Destructive actions may also be separated from ordinary commands to reduce accidental selection.

**Example:** The system can display: “Are you sure you want to permanently delete this file? This action cannot be undone.”

## Avoid Negative and Ambiguous Phrasing

Labels should communicate one clear meaning. Double negatives and vague labels can confuse users. Specific wording is better than a broad term such as *Manage*.

**Examples:** Prefer *Enable Notifications* to *Do Not Disable Notifications*. Prefer *Edit Profile* to the less specific *Manage*.

## Use Ellipses Correctly

An ellipsis (`...`) may be added when selecting an item opens a dialogue box and requires further information before the command is completed. An immediate action generally does not require an ellipsis.

**Examples:** *Save As..., Print...,* and *Find...* may require more input. *Save* and *Close* usually perform immediate actions and do not need ellipses.

## Present Disabled Items Properly

Unavailable choices may be displayed in grey instead of being removed. This maintains the menu's layout and tells users that the feature exists. Where possible, the interface should explain why an important option is disabled.

**Example:** A message may state, “Select at least one file to enable Download.”

# Navigating and Graphical Menus (5 Marks)

## Navigating Menus

Menu navigation is the process of moving between menu items, submenus, pages, and screens. It should be predictable and require as few reasonable actions as possible. Users should be able to navigate with mouse clicks, arrow keys, Tab and Enter, touch gestures, voice commands, or accessibility devices.

**Example:** In a desktop application, the arrow keys move between menu items, Enter selects an item, and Esc closes the menu. In a mobile app, tapping a menu item opens the corresponding screen.

## Show the User’s Current Location

Users should always know where they are within a system. Their location can be indicated through a highlighted menu item, page heading, breadcrumb trail, selected tab, or progress indicator.

**Example:**

> Home > Electronics > Mobile Phones > Product Details

This breadcrumb shows the path and allows the user to return quickly to a higher level.

## Provide Back, Home, and Exit Options

Each menu should offer an easy way to return to a previous screen or leave the current activity. Common controls include *Back, Home, Cancel, Close, Exit, Previous,* and *Next*. Their positions should remain consistent.

**Example:** A registration wizard may show *Back*, *Next*, and *Cancel* at the bottom of every step so users are not forced to complete an unwanted process.

## Minimize the Number of Menu Levels

Deep hierarchies increase navigation time and memory load. Users may forget the path they followed or open the wrong submenu. Designers should use broad, meaningful categories; avoid unnecessary submenus; put frequent commands at higher levels; and provide search for large collections.

**Example:** A frequently used *Print* command should be directly under the *File* menu instead of being hidden under *File → Tools → Document Actions → Output → Print*.

## Provide Feedback During Navigation

A system should respond immediately when a user points to or selects an item. Feedback may include highlighting an item, changing its background, displaying a pressed-button effect, opening the requested page, showing a loading indicator, or presenting a message.

**Example:** When the pointer moves over *Settings*, the item changes colour. After it is selected, the Settings page opens and the item remains highlighted.

## Graphical Menus

A graphical menu presents commands using visual elements such as icons, buttons, tabs, pictures, cards, and toolbars. These menus are common in smartphones, kiosks, games, multimedia applications, and websites. Graphical elements make interfaces attractive and help users recognize frequently used commands quickly.

**Examples:** A house icon represents *Home*, a gear represents *Settings*, a cart represents *Shopping Cart*, a magnifying glass represents *Search*, and a bell represents *Notifications*.

## Use Familiar and Understandable Icons

Icons should represent concepts users already understand. An unfamiliar icon may create more confusion than a text label. When meaning is not obvious, designers should provide a label, tooltip, accessible name, or help information. Icons should also be visually distinct.

**Example:** A floppy-disk icon is traditionally used for *Save*, but a less familiar custom icon should include the text “Save” or show a tooltip when the pointer rests on it.

## Types of Graphical Menus

### Pull-Down Menu

A pull-down menu appears below a menu title when selected. It is common in desktop applications.

**Example:** Selecting *File* in a word processor opens a list containing *New, Open, Save,* and *Print*.

### Pop-Up or Context Menu

A context menu appears near a selected object, usually after a right-click or long press. It contains commands related to that object.

**Example:** Right-clicking a file may display *Open, Rename, Copy,* and *Delete*.

### Toolbar

A toolbar contains icons or buttons for frequently used commands.

**Example:** A word processor toolbar may include *Save, Undo, Redo,* and *Print* icons.

### Tab Menu

Tabs divide content into major sections, with one section normally visible at a time.

**Example:** A settings screen may use *General, Privacy, Notifications,* and *Security* tabs.

### Pie Menu

A pie menu arranges options in a circle around the pointer. Since each option is close to the centre, experienced users can select commands quickly.

**Example:** A drawing program may display brush, colour, erase, and shape tools around the pointer.

### Hamburger Menu

A hamburger icon opens a hidden navigation panel. It saves screen space on mobile devices, but important options should not be hidden unnecessarily.

**Example:** Tapping the three-line icon in a mobile app may reveal *Home, Orders, Profile,* and *Help*.

## Accessibility of Graphical Menus

Graphical menus should be usable by people with different abilities. Designers should ensure that:

- Text has sufficient contrast against its background.
- Icons have text alternatives or accessible names.
- Menus can be operated using a keyboard.
- Selection is not indicated by colour alone.
- Touch targets are sufficiently large.
- Screen readers can announce menu items.
- Keyboard focus indicators are clearly visible.

**Example:** A selected tab may be shown with both a colour change and an underline, allowing users who cannot distinguish certain colours to identify it.

## Consistency in Graphical Menus

Graphical controls should have the same meaning throughout an application. Their positions and behaviour should remain stable, allowing users to apply knowledge from one screen to another.

**Example:** If a gear icon represents *Settings* on the home screen, it should not represent *Tools* on another screen. Similarly, the main navigation menu should not move unpredictably between pages.

# Conclusion

Menus are essential components of human–computer interaction because they present available commands, support navigation, organize features, reduce memory load, and prevent errors. Their effectiveness depends on structure, content, wording, formatting, navigation, and graphical presentation.

A good menu should have a logical structure, clear titles, meaningful command labels, related groups, consistent formatting, and visible navigation controls. Graphical elements should be familiar and should provide immediate feedback. Menus should also support keyboard and touch interaction and satisfy accessibility requirements.

Therefore, proper menu design makes a system easier to learn, faster to operate, and less likely to produce user errors. A thoughtfully designed menu improves both the usability of an interface and the overall user experience.
