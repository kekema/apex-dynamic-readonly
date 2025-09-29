# apex-dynamic-readonly
Dynamic Action plugin to set/unset an item Read-Only. Both IG column items as well as regular page items are supported. Read-Only items do have UI interaction blocked except for setting focus. Programmatically, they can still be accessed and their value adjusted. Contrary to disabled items, read-only items do get recognized by screenreaders. Their values also do get submitted - take care of doing any necessary validation/recalculation server-side.

![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-page-items.jpg)
![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-items-ig-grid.jpg)
![image](https://github.com/kekema/apex-dynamic-readonly/blob/main/read-only-items-ig-srv.jpg)

Also see [this blog item](https://karelekema.hashnode.dev/oracle-apex-set-item-read-only-plugin).

For IG, the typical events to use for setting Read-Only are the Row Initialization event and the Column Item on Change event. 
Row Initialization event you can use in case a column item is always Read-Only. 

<p>
<img width="25%" height="25%" alt="Image" src="https://github.com/user-attachments/assets/e2d3ae7f-b406-446e-beb9-696680936958" />
</p>

Column Item on Change event you can use when there is a dependency on another column value. Suppose you have a Class column and a Discount column. If the Class name is 'First', Discount should be Read-Only. So you can create the on Change DA like this:

<p>
<img width="30%" height="30%" alt="Image" src="https://github.com/user-attachments/assets/47284649-84e0-44f8-a680-ef785b39cd6d" />

<img width="40%" height="40%" alt="Image" src="https://github.com/user-attachments/assets/93d441b5-9f2d-44ee-a1c3-6a62838e7c3f" />
</p>

For the true/false actions, check 'Fire on Initialization'

<p>
<img width="20%" height="20%" alt="Image" src="https://github.com/user-attachments/assets/27c464d4-fc8e-4d53-b199-c3f1e030ffba" />
</p>

Limitation: the plugin won't work well with Checkboxes in IG.

For installation, notice there are 2 plugins to be installed for respectively set and unset action.

Compatibility is with APEX 24.2
