# Map SkillSelect invitation cutoffs to ANZSCO

Archived design for the original lookup. See the [deployed 2013 and 2022 mapping](../docs/australia/skillselect-anzsco-mapping.md).

Resolve SkillSelect occupation labels to ANZSCO 2013 codes once, then fetch invitation history by code. Use the alternative title table as a second source of exact matches and as a search entry point. A user who selects “Physical Therapist” should see the same invitation history as a user who selects “Physiotherapist” or enters `252511`.

The live exact-match audit resolved **1,635 of 1,642 cutoff rows** across 14 rounds. Seven source labels need review. See the [baseline test report](SKILLSELECT_ANZSCO_TESTS.md).

## 1. Use the live tables and their existing keys

| Live table | Role | Fields used |
|---|---|---|
| `public.scr_skillselect_invitation_pts` | Published cutoff data | `round_date`, `occupation`, `subclass_189_points`, `subclass_491_points` |
| `public.scra_abs_anzsco_code_2013` | Target occupation dictionary | Integer `anzsco_code`, `principal_title` |
| `public.anzsco_alternative_title` | Exact alternative title lookup | `anzsco_code`, `description`, `category` |
| `public.skillselect_occupation_map` | Proposed mapping of accepted SkillSelect labels | Normalized source label, ANZSCO code, match method, review evidence |

The source key is `(round_date, occupation)`. Multiple SkillSelect labels may share a code across rounds. Maintain the published label and scores, including missing scores as `NULL`. The mapping table points to the canonical code, so invitation history can be reached from any alternative title that resolves to that code.

Use six-digit codes in the 2013 dictionary. Home Affairs uses ANZSCO 2013 for subclasses 189 and 491, and its federal invitation rounds cover subclass 189 and family-sponsored 491. [Home Affairs skilled occupation list](https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list), [SkillSelect rounds](https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds)

## 2. Add the mapping and define exact matching

Create a migration for `public.skillselect_occupation_map` with these fields.

| Field | Proposed rule |
|---|---|
| `normalized_occupation` | Text primary key. Require a nonempty normalized label. |
| `anzsco_code` | Required integer foreign key to `scra_abs_anzsco_code_2013.anzsco_code`. Restrict deletion of a referenced code and index this column for lookups by code. |
| `match_method` | Required text with a check constraint for `principal_title`, `alternative_title`, and `manual`. |
| `matched_title` | Required text holding the title that supported the decision. |
| `review_note` | Required for manual matches. Record the round, the reason, and a reference to the supporting source. |
| `updated_at` | Required timestamp with time zone. Refresh it when a mapping is explicitly changed. |

Use one normalization expression in backfill, future imports, and the cutoff join. Lowercase, collapse whitespace, and trim. Preserve punctuation and qualifiers such as `(General)`, `(Special Class)`, and `nec`.

Build candidates from the 2013 principal titles and from alternative title rows where `category = 'Alternative Title'`. Join alternative titles to the 2013 dictionary by code. The live check found 65 rows in this category whose codes are outside the 2013 dictionary.

Count distinct codes per normalized SkillSelect label before choosing a match. Multiple title rows for one code still produce one result. If a principal title and an alternative title lead to the same code, record the match as `principal_title`. If they lead to different codes, send the label to review. Generate suggestions for unresolved labels from variant spelling, punctuation or fuzzy similarity, and require a reviewed decision before saving a mapping.

Enable RLS and follow the cutoff table's service-role access model. If the app needs client access, expose the required history through the app's server path and keep the service-role key there.

## 3. Backfill and review historical labels

1. Generate a dry-run report grouped by normalized label with raw spellings, affected rounds, candidate codes, and affected row counts. Use the [baseline query](SKILLSELECT_ANZSCO_TESTS.md#reproduce-the-baseline) as the starting point.
2. Backfill the 210 unique principal matches in one transaction. Insert only missing labels so reruns preserve existing decisions. Report any existing mapping whose exact candidates have changed for review.
3. Review these seven historical rows. The codes are candidates verified to exist in the live 2013 dictionary.

| Round | Published label | Candidate principal title | Code | Review |
|---|---|---|---:|---|
| 2024-06-13 | Engineering Professionals (nec) | Engineering Professionals nec | 233999 | Verify punctuation variant. |
| 2024-06-13 | Life Scientist (nec) | Life Scientists nec | 234599 | Verify singular/plural and punctuation. |
| 2024-06-13 | Psychologist (nec) | Psychologists nec | 272399 | Verify singular/plural and punctuation. |
| 2024-06-13 | Registered Nurses (nec) | Registered Nurses nec | 254499 | Verify punctuation variant. |
| 2024-06-13 | Software and Applications Programmers (nec) | Software and Applications Programmers nec | 261399 | Verify punctuation variant. |
| 2024-11-07 | Medical Radiation Therapist+ | Medical Radiation Therapist | 251212 | Check what the trailing marker means before assigning the code. |
| 2023-05-25 | Patho | Pathologist | 253915 | Home Affairs publishes the abbreviation. Seek a source that confirms the full title or code. Keep this row unresolved until confirmed. |

[Home Affairs previous rounds](https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect/rounds/previous-rounds)

4. Apply approved decisions as explicit mapping records. The current snapshot shows each exception in a single round. If a source label later proves to have different meanings across rounds, use an explicit round-and-label override for those rows and check it before the general label map.

## 4. Integrate invitation history and imports

1. Create a service-role query or security-invoker view that left joins each cutoff row to the mapping and 2013 dictionary. Return the round, published label, resolved code, principal title, and both points fields. Keep unresolved rows visible to internal reporting. The occupation history lookup filters to the selected code and orders by round date.
2. Have the occupation search pass the selected code into the history request. The current search calls `search_job_titles`. Verify that its exact alternative-title results resolve to a valid 2013 code for this feature. Show multiple distinct codes as choices if the input is ambiguous. [Occupation search component](../web-app/src/components/OccupationSearch.jsx)
3. After each successful scrape, run the resolver on new labels and report unmatched, ambiguous, and previously mapped labels whose candidates changed. Retain reviewed mappings across imports. Make writes repeatable using the normalized primary key and a transaction.
4. Check for multiple raw rows that resolve to the same `(round_date, anzsco_code)` after each backfill and import. Keep both source rows for review and withhold the affected round/code from published history until the discrepancy is resolved. Preserve the raw scores for that decision.

## 5. Cut over after validation

Run the [acceptance tests](SKILLSELECT_ANZSCO_TESTS.md#acceptance-tests-after-implementation) on staging, then run the production dry-run against the current source snapshot. For the 1,642-row baseline, expect a row-preserving join, zero changes to labels or score values, and 1,635 exact matches before manually approved exceptions. Each remaining unresolved label should appear in the review report. Enable the history lookup after verifying the search entry points, permissions, and collision handling. If the lookup needs to be rolled back, disable its serving path and retain the scraped cutoff data and recorded mapping decisions.
