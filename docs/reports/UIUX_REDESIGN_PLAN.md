# Migration Assistant UI/UX redesign plan

**First release:** Help a visitor choose a country, finish a points estimate on a phone, understand which answers contributed, and open the relevant official guidance while keeping their work available.

## What the current experience shows

| Journey | Evidence | Design consequence |
| --- | --- | --- |
| Choose a country | At 360 × 800, the landing headline wraps to four lines, the introduction takes five more, and the first action starts about 435 px down. Australia has the only filled button. [Landing](../../web-app/src/pages/Landing.jsx) | Put both country choices directly below a shorter heading. Give them the same visual weight. |
| Start an estimate | At the same viewport, the Australian calculator shows “65 points below the threshold” with age still unanswered. Its fixed score panel covers part of the employment section. [Calculator](../../web-app/src/pages/Calculator.jsx) · [Score display](../../web-app/src/components/FloatingScoreCard.jsx) | Distinguish unanswered questions from confirmed zero-point answers. Give the score its own space in the layout. |
| Return to a result | Home orders Australia and Canada score slides by threshold status and then by raw points. The countries use different scales. For a sparse profile, Home shows the score and CV prompt before the checklist. [Score carousel](../../web-app/src/components/home/ScoreHero.jsx) · [Home](../../web-app/src/pages/Home.jsx) | Give each country a stable place and surface the most relevant unfinished task first. |
| Edit and save | The Canadian FSW form has language labels disconnected from their selects and uses a browser alert after a save. The CV dialog closes after upload. [FSW form](../../web-app/src/pages/CanadaFSWCalculator.jsx) · [CV dialog](../../web-app/src/components/CvUploadModal.jsx) | Label fields programmatically, show save feedback beside the action, and distinguish a received file from details ready for review. |

The first two observations come from the local guest UI. At a 1280 px desktop width, the Australian form measures 712 px across and its floating score panel measures 900 px. Aligning these elements in a two-column layout would make their relationship clearer. Signed-in recommendations come from the current component code. Validate those states with synthetic profiles during prototyping.

## Visual direction

Use the app’s navy, white and slate palette. Set explanatory text in dark slate so navy links stand out. Reserve amber for details that need attention. Keep Bodoni Moda for the landing and page titles, and use Jost for field labels, section headings and score numerals. Give numeric breakdowns aligned columns and tabular figures. Start from the [active stylesheet](../../web-app/src/index.css).

On the landing page, use **“Estimate your migration points”** above two equal country choices. Each gets one line explaining what opens, such as “Federal Skilled Worker estimate” for Canada. Place “Compare pathways” beneath them as a text link. Use two columns on wide screens and stacked choices on phones. On forms, group related fields with headings and spacing. Reserve a bordered surface for the result so the eye can find it quickly.

## Delivery order

| Priority | Work to ship | Acceptance check |
| --- | --- | --- |
| 1 · Landing and calculator | Prototype Landing, the Australian form and its result together. Use a readable form column with an adjacent score breakdown on desktop. On mobile, show a compact in-flow estimate and a “View breakdown” anchor. Before input, prompt “Choose your age group to start.” As answers arrive, show a subtotal and identify outstanding inputs. Use the same result structure for FSW, with its own units and explanation. | On a 360 px phone, both country choices fit in the opening viewport. A guest can enter an answer, see which category changed, review the breakdown and revise that answer. Focused fields and the final action remain visible at 200% zoom. |
| 2 · Discover and official guidance | Give calculators, official program pages and lookup tools distinct action labels. Use “Estimate Federal Skilled Worker points” for the local flow and “Open Canada’s official CRS calculator” for the external handoff. Apply consistent new-tab behavior and accessible destination labels. | From either country, a participant can identify where a link leads and return to the original estimate with their selections and scroll position intact. Direct entry to existing calculator URLs still works. |
| 3 · Home and Profile | Replace the score carousel with visibly labeled country summaries in a stable order. When information is missing, lead with a specific action such as “Add your English test”; reuse existing profile-section links. Put CV import alongside manual entry. Show a saved state only after confirmed success and retain edits on failure. Show CV processing and review states when backed by real job status. | Test a new profile, a profile with a saved FSW estimate, and a failed save. Each has a clear next action. Reopening a saved section shows the committed value. Retrying a failed save preserves the edit. |

## Opening another page

For planning, treat “another page” as a destination the user chooses, including another app page or an external site. Use real links that open a new tab and expose “opens in a new tab” visually and to screen readers. Start with the country choices, Discover cards and official guidance links. Apply the same convention to the other page links. In-page controls such as “View breakdown” operate in the current document. Automatic sign-in redirects complete within the tab that requested the protected page.

Verify this with an edited estimate. Activate a destination link by keyboard, confirm exactly one new tab opens at the intended URL, then close it and check the original answers, focus and scroll position. Repeat for an internal calculator link and an external government link.

## Validation before rollout

1. Capture the existing mobile and desktop journeys, then prototype the first release at 360 px and 1280 px. Include empty, partial, completed and failed-save states.
2. Give five prospective users a sample profile. Ask each to choose the relevant calculator, change one answer, explain the result, open official guidance and resume. Record the first wrong turn and any place they need help. A proposed release target is four of five completing the journey unaided and correctly explaining the estimate.
3. Repeat with keyboard-only navigation, a screen reader and 200% zoom. Check page headings, labels on FSW selects, visible focus, new-tab announcements and recovery after a failed save. [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)
4. Baseline the share of calculator starts that reach a reviewed result, separately for Australia and Canada. Compare the same measure after rollout. Count steps in aggregate and omit form answers, scores and CV contents.
