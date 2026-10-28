# lauti->mobilizion Sync

Der lauti->mobilizion Sync synchronisiert alle Ereignisse die im realraum Calendar unter https://laut.realraum.at verfügbar sind auf die entsprechenden Mobilizon Gruppen (@realraum, @funkfeuer)

Die Quelle ist der ICS-Export des realraum Calendar (in der `config.json` unter `lauti`). Die URL kann in der `config.json` geändert oder als Argument übergeben werden: `pnpm start https://laut.realraum.at/ical`

# FAQ

## Mein Event ist nicht auf der Webseite

Das Event muss im realraum Calendar (lauti) eingetragen sein.

Events können von angemeldeten Nutzern in lauti-Gruppen hinzugefügt werden. Davor muss der Nutzer Mitglied der Gruppe sein. Bei Fragen an xro wenden.

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

Falls das Event doch auf der Webseite ist, kann es sein das noch nicht synchronisiert wurde. Es wird jeweiles jede 6. Stunde synchronisiert, bzw. um 0, 6, 12 und 18 Uhr

# Limitationen

Der Bot wird aktuell über den Bot-Account @grical_realraum_at betrieben, daher kann er nur in Gruppen posten auf die @grical_realraum_at zugriff hat und Moderator ist. Ebenfalls müssen diese in der config.json eingetragen sein.

Ob das richtige Bild verwendet wird, wird über den Dateinamen geprüft. Bei lauti-Bildern ist der Dateiname der Media-Hash, daher funktioniert die Prüfung zuverlässig.
