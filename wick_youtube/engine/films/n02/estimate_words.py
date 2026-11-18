# Provisional word timings from text alone (until the real VO is downloadable): phrases split at punctuation,
# syllable-weighted, with pauses after sentence ends and commas. K and the pauses are fitted to N01's real takes.
import re, json, sys
def syl(w): return max(1, len(re.findall(r"[aeiouy]+", w.lower())))
K, P_END, P_COMMA, LEAD, GAP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.205, 0.55, 0.22, 0.15, 0.7
def estimate(text, t0):
    out, t = [], t0 + LEAD
    for tok in text.replace("\n", " ").split():
        w = re.sub(r"[^\w'$]", "", tok).lower()
        if not w: continue
        out.append({"w": w, "t": round(t, 3)}); t += syl(tok) * K
        if re.search(r"[.?!]$", tok): t += P_END
        elif re.search(r"[,:;]$", tok): t += P_COMMA
    return out, t - t0
secs = json.load(open(sys.argv[1])); words, t = [], 0.0
for s in secs:
    ws, d = estimate(s["text"], t); words += ws; t += d + GAP
json.dump(words, open(sys.argv[2], "w")); print(len(words), "words, est total", round(t - GAP, 1), "s")
