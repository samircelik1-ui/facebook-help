# TODO — Telegram Inbox

## 1. Pagina di composizione del messaggio — completato
- Il sito deve avere una pagina singola con un campo di testo per comporre il messaggio.
- Il visitatore deve poter inviare ciò che scrive dal sito al Telegram configurato.
- Il campo non deve consentire l'invio di un messaggio vuoto.
- La pagina è stata implementata; il pulsante resta disattivato se il testo è vuoto o Telegram non è configurato.

## 2. Inoltro e feedback dell'invio — da completare: collegamento Telegram
- Il messaggio deve essere inoltrato in modo sicuro a Telegram tramite integrazione server-side con bot e chat configurati.
- Le credenziali del bot non devono essere esposte nel browser.
- Il sito deve mostrare uno stato di caricamento e una conferma visiva dopo l'invio riuscito.
- In caso di errore, il sito deve mostrare un messaggio chiaro e consentire di riprovare.
- Backend e stati di interfaccia sono predisposti; l'invio reale attende il token del bot e l'ID della chat, richiesti tramite scheda protetta poi annullata.

## 3. Usabilità su dispositivi e accessibilità — completato
- Il layout deve essere responsive e accessibile sia su desktop sia su dispositivi mobili.
- Etichette, descrizioni, stati annunciati e focus visibile sono presenti; la resa è stata controllata su desktop e smartphone.


## 4. Attesa progressiva prima di scrivere nella seconda schermata — in corso
- Dopo l'invio iniziale che apre la seconda schermata, il campo di scrittura deve restare disabilitato finché il visitatore non preme “Digita altro per chattare”.
- Quando il visitatore preme “Digita altro per chattare”, deve partire un conto alla rovescia visibile in secondi; durante l'attesa non si deve poter scrivere e, solo allo scadere, il campo si riattiva.
- Il primo sblocco deve richiedere 60 secondi; dopo il successivo messaggio inviato, il secondo sblocco deve richiedere 120 secondi; dopo il successivo, il terzo sblocco deve richiedere 160 secondi.
- Dopo ogni ulteriore messaggio inviato, il campo deve bloccarsi di nuovo e richiedere un nuovo clic e conto alla rovescia; dal quarto sblocco in poi la durata resta 160 secondi.
- Il countdown non deve inviare messaggi automaticamente: ogni testo viene inoltrato solo quando il visitatore preme “Send to Telegram”.
