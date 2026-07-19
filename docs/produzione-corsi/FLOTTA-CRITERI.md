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
