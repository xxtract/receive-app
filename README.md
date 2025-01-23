# Ontvangst App

Een applicatie voor het zoeken van bedrijven en het scannen van producten.

## Features

### Bedrijf Zoeken
- Zoeken op GLN nummer of bedrijfsnaam
- Automatische suggesties tijdens het typen
- Keyboard navigatie door zoekresultaten
- GLN nummer kopiëren naar klembord

### Product Scanning
- GTIN scannen en valideren
- Automatische herkenning van bekende producten
- Ondersteuning voor onbekende GTINs
- Product counter voor aantal gescande items
- Visuele indicatie van product hiërarchie met brackets
- Verwijderen van gescande producten met bevestiging

### Verpakkingslagen
- Selectie van verpakkingslaag (basis eenheid, tussenverpakking, omdoos)
- Automatische producttype selectie gebaseerd op verpakkingslaag
- Validatie van verplichte velden met rode border indicatie
- Focus management voor efficiënt invullen

### Excel Export
- Download knop voor Excel bestand
- Automatisch gegenereerde bestandsnaam met:
  - GLN nummer
  - Bedrijfsnaam
  - Datum (dd-mm-jjjj)
  - Tijd (uu:mm)
- GTIN formatting als tekst om leading zeros te behouden
- Geoptimaliseerde kolom breedtes
- Disabled state wanneer verplichte velden niet zijn ingevuld

### Visuele Feedback
- Spinners tijdens laden
- Alert meldingen voor gebruikersacties
- Highlighting van dubbele GTINs
- Visuele indicatie van product hiërarchie
- Rode border voor niet-ingevulde verplichte velden
- Hover states voor interactieve elementen

## Installatie

1. Installeer Node.js dependencies:
```bash
npm install
```

2. Voor development:
```bash
npm install --save-dev
```

3. Start de applicatie:
```bash
npm start
```

Voor development met auto-reload:
```bash
npm run dev
```

## Dependencies

Zie [requirements.txt](requirements.txt) voor een complete lijst van dependencies.
