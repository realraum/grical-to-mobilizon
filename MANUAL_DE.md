# grical->mobilizion Sync

Der grical->mobilizion Sync synchronisiert alle Ereignisse die auf der realraum.at Website bzw unter https://r3.at/events.ical verfügbar sind auf die entsprechenden Mobilizon Gruppen (@realraum, @funkfeuer)

# FAQ

## Mein Event ist nicht auf der Webseite

Das Event muss in der Grical-Gruppe !r3 sein

Events können von angemeldeten Nutzern in Grical-Gruppen hinzugefügt. Davor muss der Nutzer Mitglied der Gruppe sein. Bei Fragen an xro wenden.

## Wie mache ich ein Banner?

Ein Banner kann auf zwei Wege hinzugefügt werden:

- URL namens `img` mit dem URL zum Bild
- Text in der Beschreibung `#banner=URL`

Bitte beachte: Der Link muss direkt zum Bild führen und nicht bspws. zu einer Webseite die das Bild anzeigt

## Vorlagen für Typische Events

Es gibt vorlagen, diese sind in der config.json definiert.
Eine Vorlage ist folgendermaßen definiert

```js
["Regex das mit i flag gemachted wird", {
  "organizer": "mobilizon gruppen name",
  "summary": "Alternative beschreibung nur für mobilizion",
  "picture": { "mediaId": "id vom bild das verwendet werden soll" },
  "picture": null, // entfernt default bild
  "banner": "url", // verwendet url als banner
  "title": "Alternativer titel nur für mobilizon",
  "tags": ["alternative tags", "nur für mobilizion"],
}]
```

Jeder key ist optional

## Optionen für einzelne Events

Mit `#key=value` können gewisse Parameter gesetzt werden

`#organizer=mobilizion gruppen name`: Erstellt/Verschiebt event in angegebene mobilizion gruppe

`#banner=URL`: Benutzt diesen URL als banner

## Mein Event ist nicht auf Mobilizon

- Ist das Event auf der Webseite? Nein: Siehe erster punkt

Falls das Event doch auf der Webseite ist, kann es sein das noch nicht synchronisiert wurde. Es wird jeweiles jede 6. Stunde synchronisiert, bzw. um 0, 6, 12 und 18 Uhr

# Limitationen

Der Bot wird aktuell über den Bot-Account @grical_realraum_at betrieben, daher kann er nur in Gruppen posten auf die @grical_realraum_at zugriff hat und Moderator ist. Ebenfalls müssen diese in der config.json eingetragen sein.

Bei eigenen bannern: Ob das richtige banner verwendet wird, wird über den Dateinamen geprüft. D.h. wenn das banner vorher `https://website.com/image.php?photo=3` und nachher `https://website.com/image.php?photo=4` war, kann der bot das nicht unterscheiden, da beide Dateinamen `image.php` sind.
