Adaptive QWERTY

Adaptive QWERTY is an HCI research prototype that explores whether a personalized QWERTY keyboard can improve one-handed mobile typing by adapting the keyboard layout to the user's hand and thumb reach.

Live Demo

https://adaptiveqwerty.vercel.app/

Project Goal

Standard smartphone QWERTY keyboards use the same layout for every user, even though hand size, thumb reach, and handedness differ. This project investigates whether adapting a familiar QWERTY layout to the individual user can make one-handed typing more comfortable and efficient.

Current Prototype

The current version includes:

A custom on-screen QWERTY keyboard

A target phrase for transcription

A live text display showing what the user types

Space and backspace controls

A mobile-focused interface that can be tested in a browser on a smartphone

Planned Features

The next versions of the prototype will add:

Left-hand and right-hand selection

Thumb-reach calibration

Adaptive keyboard positioning and sizing

Standard vs. adaptive keyboard modes

Typing completion time

Words per minute (WPM)

Error-rate measurement

Backspace/correction tracking

Comfort and preference ratings

Experimental result collection for the HCI evaluation

Research Question

Can a QWERTY keyboard personalized to a user's handedness and thumb reach improve one-handed mobile typing compared with a standard QWERTY layout?

Planned Evaluation

The prototype is intended to be evaluated using a within-subject study in which participants complete similar typing tasks using both a standard QWERTY layout and the adaptive version.

Potential measurements include:

Typing speed

Completion time

Error rate

Number of corrections/backspaces

Perceived comfort

User preference

Technology Stack

HTML

CSS

JavaScript

GitHub for version control

Vercel for deployment

Project Structure

Adaptive-QWERTY/
├── index.html
├── style.css
├── script.js
└── README.md

Running Locally

Clone the repository:

git clone https://github.com/Aaronwins/Adaptive-QWERTY.git

Open the project folder.

Open index.html in a browser.

No installation or build process is currently required.

Deployment

The project is deployed through Vercel. Changes pushed to the connected GitHub repository are automatically redeployed to the live site.

Author

Aaron Amalraj

HCI Individual Research Project