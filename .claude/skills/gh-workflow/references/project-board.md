# Tablero del proyecto FinApp (Projects V2)

La toolset de Projects **no** está activada en el servidor MCP, así que el tablero se maneja siempre
con `gh project`.

## IDs cacheados

Estos valores son estables; no hace falta redescubrirlos en cada uso.

| | |
|---|---|
| Proyecto | número `2`, node id `PVT_kwHOCaelWs4BWWzJ` |
| Owner | `MrClit` |
| Campo Status | `PVTSSF_lAHOCaelWs4BWWzJzhRrz6Q` |

Opciones del campo Status:

| Estado | option-id |
|---|---|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

> Si algún comando falla con un id desconocido, revalidarlos con
> `gh project field-list 2 --owner MrClit --format json` y actualizar esta tabla.

## Añadir una issue al tablero

```bash
gh project item-add 2 --owner MrClit --url "https://github.com/MrClit/fin-app/issues/$N"
```

## Mover una issue de estado

El `item-id` es propio del tablero (`PVTI_…`) y **no** es el número de la issue: hay que resolverlo.

```bash
# 1. item-id a partir del número de issue
ITEM=$(gh project item-list 2 --owner MrClit --limit 500 --format json \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(next(i['id'] for i in d['items'] if i['content'].get('number')==$N))")

# 2. mover al estado deseado (aquí, In progress)
gh project item-edit \
  --id "$ITEM" \
  --project-id PVT_kwHOCaelWs4BWWzJ \
  --field-id PVTSSF_lAHOCaelWs4BWWzJzhRrz6Q \
  --single-select-option-id 47fc9ee4
```

`--project-id` exige el **node id** (`PVT_…`), no el número del proyecto.

## Consultar el estado actual de una issue

```bash
gh project item-list 2 --owner MrClit --limit 500 --format json \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(next((i.get('status'),i['content']['title']) for i in d['items'] if i['content'].get('number')==$N))"
```
