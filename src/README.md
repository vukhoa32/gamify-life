# Introduction
- So i really like games, i can binge playing for a long time, get my head hurts, make my character stronger instead of myself. I tried so many ways to get rid of bad habits like this but failed everytime. So i think, maybe i can replicate gaming experience into my life
- I'm thinking of creating a convenient app, that i can log my activity quickly on my phone. Think about a hosting website, a github page first to be simple
- This is a hobby project
- When logging, i will feel like my day is completed, i can wrap up and go to sleep early without the regret that the day is over and i kind of haven't achieved anything

# To AI
- Pls use the least token you can. Save that to a skill i think. Whenever i consume too many tokens pls let me know
- Pls answer with the least wording, no need for grammatically correct. If it's too long, add a TLDR that bottom with bullet points

# Idea
- I like to have some visual effects so i can feel the grafication like playing games
- Focus on the UI/UX for mobile. I only want to use this web page for my app
- Layout: 1st row is tabs to switch screen
- Show tabs
  - Activities (logging)
  - Events
  - Goals
- Main page (Activities)
  - Layout: 3 sections - 1st is the activity list to select to log ; 2nd, show the logged activities by date, prioritize today ; 3rd, 2 footer buttons to switch view options
  - Tab activities is the default one. Show list of activities as buttons:
    - Walking, Elliptical
    - Running
    - Main job
    - Sleep early
    - Cooking, cleaning
    - Tech learning
    - IT blog reading
    - Journaling
    - Job seeking
    - Singing
    - Lying in bed
    - Talk to a friend
    - Hiking
    - Ride scooter
  - When user clicks on an activity, show a dialog (dialogA) that has 2 options: Cancel, ok. There are 2 fields: 1. checkbox High intensity? ; 2. Description - text area with 2 lines.
    - If click cancel, close dialog
    - If click ok, the activity is logged and is shown on the below section
    - The right side of each activity button has a small button. When clicking that, the activity is added right away without the dialogA showing up
  - In the logged activities section, each logged item is clickable, when clicking show the dialog dialogA again, so the user can update the activity. On the right side of each logged activity, there is a delete button, clicking twice with delete it
  - Footer icon buttons at the bottom. When clicking a button, that button is switched on/off, and all other buttons is switched off:
    - 1st: Expand the activity log view to full screen
    - 2nd: Show a list of dates with logged activities shown as icons
