# Word timings without speech-to-text: we know the text, so match the script's phrase breaks
# (punctuation) to the longest pauses in the audio, then spread each phrase's words across its
# speaking time by syllable weight. Good to a few tenths of a second.
import re, json, subprocess, sys
def syl(w): return max(1, len(re.findall(r"[aeiouy]+", w.lower())))
def align(mp3, text, t_off):
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",mp3]).decode())
    err = subprocess.run(["ffmpeg","-hide_banner","-i",mp3,"-af","silencedetect=n=-36dB:d=0.12","-f","null","-"],capture_output=True,text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", err)]
    sil = [(s, e) for s, e in zip(starts, ends)]
    lead = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
    tail = sil[-1][0] if sil and sil[-1][1] > dur - 0.1 else dur
    inner = [(s, e) for s, e in sil if s > lead + 0.05 and e < tail - 0.05]
    phrases = [p.strip() for p in re.split(r"(?<=[.,?!])\s+", text.replace("\n", " ")) if p.strip()]
    need = len(phrases) - 1
    gaps = sorted(sorted(inner, key=lambda g: -(g[1] - g[0]))[:need])
    bounds = [lead] + [x for g in gaps for x in g] + [tail]
    spans = [(bounds[2 * i], bounds[2 * i + 1]) for i in range(len(bounds) // 2)]
    if len(spans) < len(phrases):  # not enough pauses: split the longest spans by syllables
        while len(spans) < len(phrases):
            j = max(range(len(spans)), key=lambda k: spans[k][1] - spans[k][0]); a, b = spans[j]
            spans[j:j + 1] = [(a, (a + b) / 2), ((a + b) / 2, b)]
    out = []
    for ph, (a, b) in zip(phrases, spans):
        ws = ph.split(); w = [syl(x) for x in ws]; tot = sum(w); acc = 0
        for x, s in zip(ws, w):
            out.append({"w": re.sub(r"[^\w'$]", "", x).lower(), "t": round(t_off + a + (b - a) * acc / tot, 3)}); acc += s
    return out, dur
secs = json.load(open(sys.argv[1]))
words, t = [], 0.0
for s in secs:
    ws, d = align(s["mp3"], s["text"], t); words += ws; t += d + 0.7
json.dump(words, open("words.json", "w"))
print(len(words), "words;", "total", round(t - 0.7, 2))
for w in words[::12]: print(w)
