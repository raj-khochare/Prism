# Static pipeline vs labels (241 compiled files)

Share of files in which a detector from the class's evidence family fired. Positives = recall of the static pipeline; negatives = false-positive rate.

| Class | Positives | Detected (recall) | Negatives flagged for this family (FP rate) |
|---|---|---|---|
| reentrancy | 31 | 31 (100%) | 21/113 (19%) |
| access_control | 28 | 20 (71%) | 42/113 (37%) |
| integer_overflow | 17 | 16 (94%) | 19/113 (17%) |
| unchecked_call | 52 | 52 (100%) | 4/113 (4%) |

Any detector at all: positives 98%, negatives 64%.

A class the pipeline cannot see (low recall) cannot be learned from static features, whatever the model.