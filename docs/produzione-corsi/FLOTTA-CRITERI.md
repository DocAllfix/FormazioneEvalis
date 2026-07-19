# Criteri flotta batch avatar (anti-perdite di tempo, lezioni del 19/07)

## Filtri statici (search offers)
- reliability2 >= 0.99  (0.98 ha fatto passare host instabili)
- inet_down >= 800 Mbps (collo reale = rete; preferire >1200)
- disk_space >= 80 GB · dph <= $0.40 · rentable
- verification=verified quando possibile

## Pre-flight dinamico per OGNI pod (auto-sostituzione, zero attese manuali)
1. BOOT: se non "running" entro 6 min dal create -> destroy + pod sostitutivo su altro host
2. RESTORE: snapshot 6.4GB; se non completo entro 8 min -> destroy + sostituto
   (misura reale della rete, non quella dichiarata)
3. SANITY: nvidia-smi + import torch/mmcv/cv2 OK prima del render (gia' in pod-setup)
4. BLACKLIST: host falliti -> produzione/_staging/vast-blacklist.json, esclusi dalle
   ricerche successive (macchina, non solo offerta)

## Perche' funziona anche se un pod muore a meta'
- clip idempotenti (.ok su R2): il finisher (SHARD_TOTAL=1) chiude i buchi
- nessun lavoro perso: si perde al massimo la clip in corso su quel pod

## Host noti
- BUONI: macchina di 43965881 (19/07 mattina: pull veloce, 1688Mbps reali, zero problemi)
- LENTI/INSTABILI (19/07): offerte 41130302/41130310 (stessa macchina), 41267735 (offline durante il boot)

## AGGIUNTA 19/07 sera (lezione host A/B)
- La CPU conta quanto la GPU: prep landmark e blending/encode sono CPU-bound.
  Host 35283316 (CPU debole): prep 2.5 fr/s vs 10 fr/s del host di mattina = 4x piu' lento.
- FILTRO AGGIUNTIVO flotta: cpu_cores_effective >= 16 e cpu_ghz >= 3.0 (o benchmark
  al pre-flight: prep rate < 6 fr/s nei primi 2 min -> destroy + sostituto).
- Immagine Docker: host datacenter (rel>=0.995) scaricano senza throttle (boot 3 min);
  host amatoriali si impiantano sul pull di Docker Hub (visti 3 casi > 15 min).

## PROFILO HOST VINCENTE (misurato 19/07, machine 10914: prep 10.3 fr/s = 8x il peggiore)
CPU Threadripper PRO 5995WX (64c fisici, 18 effettivi) · PCIe 17.5 GB/s · NVMe 1371 MB/s
· verified · rel 0.996 · UE (Norvegia). CPU workstation/server = il vero discriminante.

## QUERY FLOTTA DEFINITIVA (search offers)
  gpu_name=RTX_4090 num_gpus=1 verified=true reliability2>=0.995
  cpu_cores>=32 cpu_cores_effective>=14 pcie_bw>=12 disk_bw>=800
  inet_down>=800 disk_space>=80 rentable=true  (ordina per dph)
Host già noti buoni: machine 10914 (Threadripper, questa) e la macchina del pilota mattina.
Pre-flight resta obbligatorio: boot<=8min, prep-rate>=6 fr/s nei primi 2 min, altrimenti destroy+sostituto.
