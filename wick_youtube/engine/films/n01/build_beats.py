# Beat timing from the VO: the (n-1) longest pauses in each section are the beat breaks.
import subprocess, re, json
secs = [("vo_01_coldopen",3),("vo_02_ch1",6),("vo_03_ch2",4),("vo_04_ch3",5),("vo_05_ch4",5),("vo_06_turn",5),("vo_07_payoff",4),("vo_08_close",3)]
GAP = 0.7
beats, t0, files = [], 0.0, []
for name, n in secs:
    f = f"audio/{name}.mp3"
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]).decode())
    out = subprocess.run(["ffmpeg","-hide_banner","-i",f,"-af","silencedetect=n=-38dB:d=0.35","-f","null","-"],capture_output=True,text=True).stderr
    sil = [(float(a), float(b)) for a, b in re.findall(r"silence_end: ([0-9.]+) \| silence_duration: ([0-9.]+)", out) if float(a) < dur - 0.5]
    cuts = sorted(sorted(sil, key=lambda s: -s[1])[: n - 1])
    marks = [0.0] + [e - d / 2 for e, d in cuts] + [dur]
    for k in range(n):
        beats.append({"start": round(t0 + marks[k], 3), "end": round(t0 + marks[k + 1], 3), "sec": name})
    files.append((f, dur)); t0 += dur + GAP
json.dump({"beats": beats, "duration": round(t0 + 2.5, 2)}, open("beats.json", "w"), indent=1)
with open("audio/concat.txt","w") as c:
    for f, d in files:
        c.write(f"file '{f.split('/')[1]}'\nfile 'gap.wav'\n")
subprocess.run(["ffmpeg","-v","error","-y","-f","lavfi","-i","anullsrc=r=44100:cl=stereo","-t",str(GAP),"audio/gap.wav"])
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i","audio/concat.txt","-ar","44100","-ac","2","audio/vo.wav"])
print(len(beats), "beats, total", round(t0 + 2.5, 1), "s")
for i, b in enumerate(beats): print(i + 1, b["start"], b["end"])
