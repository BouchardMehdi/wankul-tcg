# wankul tcg
openning and game tcg wankul

## Production PWA

Variables utiles pour contrôler les mises à jour de l'app installée :

```env
APP_VERSION=1.0.0
MIN_SUPPORTED_APP_VERSION=1.0.0
```

`APP_VERSION` indique la dernière version disponible côté serveur. `MIN_SUPPORTED_APP_VERSION`
permet de bloquer les versions installées trop anciennes et de forcer la mise à jour.

Quand le frontend est buildé séparément, utilise la même valeur via `APP_VERSION` ou
`VITE_APP_VERSION` au moment du build afin que la version embarquée dans la PWA corresponde au
serveur.
