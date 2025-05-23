# apex-dynamic-readonly
Dynamic Action plugin to set/unset an item Read-Only. Both IG column items as well as regular page items are supported. Read-Only items do have UI interaction blocked except for setting focus. Programmatically, they can still be accessed and their value adjusted. Contrary to disabled items, read-only items do get recognized by screenreaders. Their values also do get submitted - take care of doing any necessary validation/recalculation server-side.

![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-page-items.jpg)
![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-items-ig-grid.jpg)
![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-items-ig-srv.jpg)

For a further overview, see [this blog item](https://karelekema.hashnode.dev/oracle-apex-set-item-read-only-plugin).

For installation, notice there are 2 plugins to be installed for respectively set and unset action.

Compatibility is with APEX 24.2
