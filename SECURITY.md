# Sécurité · Security Policy

**[Français](#français) · [English](#english)**

---

## Français

### Signaler une vulnérabilité

**N’ouvrez pas d’issue publique.** Signalez-la en privé par GitHub :

* [Signaler une vulnérabilité](https://github.com/olivierouellet/Recolte-Crop-Card/security/advisories/new)
  dans l’onglet **Security** du dépôt, visible seulement par le responsable, ou
* écrivez directement à [@olivierouellet](https://github.com/olivierouellet).

Utile à inclure : la version, ce qu’il faut pour exploiter le problème, et une façon de le reproduire.

C’est un projet à un seul responsable, fait sur son temps libre. Comptez un accusé de réception
d’ici deux semaines; vous saurez où en est la correction. Vous serez crédité dans les notes de
version si vous le souhaitez.

### Versions prises en charge

| Version | Prise en charge |
| --- | --- |
| Dernière version publiée | ✅ |
| `main` | ✅ Les correctifs y arrivent d’abord |
| Versions antérieures | ❌ Mettez à jour avec HACS |

### Surface d’attaque

* Avec l’intégration, la carte ne lit que l’état de Home Assistant; elle ne fait aucune requête.
* En mode direct, le navigateur fait des GET vers `agriculture.canada.ca`, sans clé ni témoin. Ils contiennent l’endroit
  choisi, arrondi à quatre décimales (une dizaine de mètres). Les valeurs sont gardées 3 heures dans le
  `localStorage` du navigateur.
* La position de l’appareil n’est demandée que dans l’éditeur, quand vous touchez « Utiliser la position de cet
  appareil » : elle est alors écrite une fois dans la configuration. La carte elle-même ne la demande jamais.
* Rien de ce qui vient du réseau n’est inséré comme HTML : Lit échappe tout le texte.

---

## English

### Reporting a vulnerability

**Don't open a public issue.** Report privately through GitHub:

* [Report a vulnerability](https://github.com/olivierouellet/Recolte-Crop-Card/security/advisories/new)
  from the repository's **Security** tab, visible only to the maintainer, or
* contact [@olivierouellet](https://github.com/olivierouellet) directly.

Useful to include: the version, what an attacker needs, and a way to reproduce it.

This is a one-maintainer, spare-time project. Expect acknowledgement within 2 weeks, and you'll
be told where the fix stands. Credit in the release notes if you'd like it.

### Supported versions

| Version | Supported |
| --- | --- |
| Latest release | ✅ |
| `main` | ✅ Fixes land here first |
| Earlier releases | ❌ Update through HACS |

### Attack surface

* With the integration, the card only reads Home Assistant’s state; it makes no requests.
* In direct mode, the browser makes GET requests to `agriculture.canada.ca`, with no key and no cookies. They contain
  the chosen location, rounded to four decimals (about ten metres). Values are kept for 3 hours in the browser’s
  `localStorage`.
* The device’s location is only asked for in the editor, when you tap “Use this device’s location”: it is then written
  once into the configuration. The card itself never asks for it.
* Nothing from the network is inserted as HTML: Lit escapes all text.
