# lauti->mobilizion Sync

Der lauti->mobilizion Sync synchronisiert alle Ereignisse die im realraum Calendar unter https://laut.realraum.at verfügbar sind auf die entsprechenden Mobilizon Gruppen (@realraum, @funkfeuer)
 (dafür muss der Bot Mitglieder dieser Gruppen auf Mobilizon sein)

Die Quelle ist der ICS-Export des realraum Calendar (in der `config.json` unter `lauti`). Die URL kann in der `config.json` geändert oder als Argument übergeben werden: `pnpm start https://laut.realraum.at/groups/80217d4a-1ca5-490e-a8dd-1439b1d92145/ical`

(Anm.: es sollten nur die public events auf Mobilizon gespiegelt werden.)

# FAQ

## Mein Event ist nicht auf der Webseite

Das Event muss im realraum Calendar (lauti) eingetragen sein.

Events können von angemeldeten Nutzern in lauti-Gruppen hinzugefügt werden. Davor muss der Nutzer Mitglied der Gruppe sein. Bei Fragen an das NOC oder Vorstand wenden.

## Wie mache ich ein Banner?

Das am Event in lauti angehängte Bild (die Event-Grafik) wird automatisch als Banner verwendet. Hängt kein Bild am Event, wird das Default-Bild aus der `config.json` (`defaultPicture`) verwendet.

Bitte beachte: Das Bild muss direkt am lauti-Event hängen und nicht bloß in der Beschreibung verlinkt sein.

## Vorlagen für Typische Events

Es gibt vorlagen, diese sind in der config.json definiert.
Eine Vorlage ist folgendermaßen definiert

```js
["Regex das mit i flag gemachted wird", {
  "organizer": "mobilizon gruppen name",
  "summary": "Alternative beschreibung nur für mobilizion",
  "picture": { "mediaId": "id vom bild das verwendet werden soll" },
  "picture": null, // entfernt default bild
  "title": "Alternativer titel nur für mobilizon",
  "tags": ["alternative tags", "nur für mobilizion"],
}]
```

Jeder key ist optional

## Tags

Die lauti-Kategorien (auf der lauti-Webseite unter „Was:“ sichtbar) sowie die dort separat angezeigten Hashtags (z.B. `#freiraumfest`) werden als Mobilizon-Tags übernommen. Mehrere Kategorien sind in lauti durch Kommas getrennt; aus `r3,treffen` werden also die Tags `r3` und `treffen`. Doppelte Tags werden zusammengeführt.

In einer Vorlage kann `tags` gesetzt werden; diese Tags werden zu den lauti-Tags hinzugefügt (Duplikate werden zusammengeführt).

## Optionen für einzelne Events

Mit `#key=value` können gewisse Parameter gesetzt werden

`#organizer=mobilizion gruppen name`: Erstellt/Verschiebt event in angegebene mobilizion gruppe

## Maximale Vorlaufzeit

Mit `maxFutureDuration` in der `config.json` kann begrenzt werden, wie weit in der Zukunft Events veröffentlicht werden. Standardmäßig werden Events, die mehr als 4 Monate in der Zukunft liegen, nicht auf Mobilizon veröffentlicht:

```json
"maxFutureDuration": { "months": 4 }
```

Der Wert ist ein Luxon-Duration-Objekt, z.B. `{ "days": 30 }` oder `{ "months": 6 }`. Wird die Option weggelassen, gibt es keine Begrenzung.

## Mein Event ist nicht auf Mobilizon

- Ist das Event auf der Webseite? Nein: Siehe erster punkt

Falls das Event doch auf der Webseite ist, kann es sein das noch nicht synchronisiert wurde.

## Nicht-lauti-Events finden

`pnpm report` listet alle zukünftigen Events der konfigurierten Gruppen, die nicht aus lauti stammen. Zu jedem Event wird der Link zur Event-Seite ausgegeben, wo es bei Bedarf manuell gelöscht werden kann.

Events, die aus lauti stammen (erkennbar an `onlineAddress`), aber deren URL nicht mehr in der aktuellen lauti-ICS-Datei vorkommt, werden als verwaist gemeldet und standardmäßig **nicht** gelöscht. Mit dem Schalter `--autoremove-deleted` werden genau diese verwaisten lauti-Events ohne Rückfrage gelöscht:

```sh
pnpm report --autoremove-deleted
```

Das Skript wartet nie auf Benutzereingaben. Nicht-lauti-Events werden immer nur gemeldet und nie gelöscht. Die erkannten lauti-Hosts können in der `config.json` unter `lautiHosts` ergänzt werden.

`pnpm report` meldet außerdem Events, die auf dieselbe lauti-URL zeigen (siehe nächster Abschnitt).

## Doppelte lauti-URLs (Duplikate)

Zeigen mehrere Mobilizon-Events auf dieselbe lauti-URL, wählt der Sync deterministisch jene Kopie mit der kleinsten Event-ID (also das älteste Event) und löscht alle weiteren Kopien. Schlägt das Löschen fehl (z.B. fehlende Berechtigung), wird das gemeldet und beim nächsten Mal erneut versucht.

`pnpm report` listet alle Duplikate mit Event-IDs, Gruppen und Links auf, damit man vor dem nächsten Sync-Lauf sieht, was gelöscht wird.

# Limitationen

Der Bot wird aktuell über den Bot-Account @r3calendarbot betrieben, daher kann er nur in Gruppen posten in denen @r3calendarbot Moderator ist. Ebenfalls müssen diese in der config.json eingetragen sein.
