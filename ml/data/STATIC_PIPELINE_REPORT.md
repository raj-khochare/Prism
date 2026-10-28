# Static pipeline vs labels (206 compiled files)

Share of files in which a detector from the class's evidence family fired. Positives = recall of the static pipeline; negatives = false-positive rate.

| Class | Positives | Detected (recall) | Negatives flagged for this family (FP rate) |
|---|---|---|---|
| reentrancy | 29 | 29 (100%) | 20/94 (21%) |
| access_control | 17 | 13 (76%) | 36/94 (38%) |
| integer_overflow | 15 | 14 (93%) | 19/94 (20%) |
| unchecked_call | 51 | 51 (100%) | 1/94 (1%) |

Any detector at all: positives 98%, negatives 64%.

A class the pipeline cannot see (low recall) cannot be learned from static features, whatever the model.