window.lib4x = window.lib4x || {};
window.lib4x.axt = window.lib4x.axt || {};

/*
 * LIB4X - Set/Unset Read-Only
 * Dynamically Set/Unset the Read-Only mode for an Item (DA Plugin)
 * Supports both IG Column Items as well as regular Page Items
 * 
 * Read-Only items do have UI interaction blocked except for setting focus.
 * Programmatically, they can still be accessed and set.
 * Unlike disabled items, there (calculated) values just do get submitted.
 * Disabled items are ignored by screenreaders; Read-Only items aren't.
 * In Read-Only state, an item has special styling, see CSS.
 */
lib4x.axt.readonly = (function($)
{
    const ACTION_SET = 'SET';
    const ACTION_UNSET = 'UNSET';
    const C_LIB4X_READONLY_DA = 'lib4x-readonly-da';
    const C_LIB4X_IS_READONLY = 'lib4x-readonly is-readonly';
    const C_LIB4X_READONLY = 'lib4x-readonly';
    const C_LIB4X_DISABLED = 'lib4x-disabled';
    const RE_LIB4X_READONLY = new RegExp(`\\b${C_LIB4X_IS_READONLY}\\b\\s*`, 'g');

    const C_IS_ACTIVE = 'is-active';
    const C_BUTTON_CAL = 'a-Button--calendar';
    const C_BUTTON_CP = 'a-Button--colorPicker';
    const C_BUTTON_LOV = 'a-Button--popupLOV';

    const C_T_FORM_FIELDCONTAINER = 't-Form-fieldContainer';
    const C_MARKDOWN_EDITOR = 'markdown_editor';
    const C_ITEM_MARKDOWN_EDITOR = 'apex-item-markdown-editor';
    const C_MDE_TOOLBAR = 'a-MDEditor-toolbar';
    const C_LISTMANAGER = 'listmanager';
    const C_FIELDSET_LISTMANAGER = 'apex-item-fieldset--list-manager';
    const C_ITEM_POPUP_LOV = 'apex-item-popup-lov';
    const C_ITEM_MULTI = 'apex-item-multi';
    const C_ITEM_GROUP_POPUP_LOV = 'apex-item-group--popup-lov';
    const C_SWITCH_TOGGLE = 'a-Switch-toggle';
    const C_ITEM_SWITCH = 'a-Switch';
    const C_ITEM_STARRATING = 'apex-item-starrating';
    const C_ITEM_AUTOCOMPLETE = 'apex-item-auto-complete';
    const C_ITEM_COLOR_PICKER = 'apex-item-color-picker';
    const C_CK_EDITOR = 'ck-editor';
    const C_ITEM_COMBOSELECT = 'apex-item-comboselect';

    const INTERACTIVE_KEYS = [
        ' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown'
    ];
    const F_CHOICE_CLASSES = '.apex-item-single-checkbox, .apex-item-checkbox, .apex-item-radio, .a-Switch';
    const DIALOG_SELECTOR = '.ui-dialog-popuplov, .ui-dialog-datepicker, .ui-dialog-comboSelect, .ui-dialog-color-picker';

    // ==page module
    let pageModule = (function()
    {      
        // get the APEX item element which opens the dialog/popup
        function getDialogParentElement(dialog$)
        {
            let opener = {};
            let currentPageNr = $('#pFlowStepId').val();
            // dialog id examples: PopupLov_69_P69_POPUP_LOV_dlg, example: CS_69_P69_AUTOCOMPLETE, P69_COLOR_PICKER_ColorPickerDlg, P69_DATE_dialog
            let match = dialog$.id.match(/^(?:(?:PopupLov|CS)_(\d+)_(.+?)(?:_dlg)?|([a-zA-Z0-9_$]+(?:_[a-zA-Z0-9_$]+)*)_(?:ColorPickerDlg|dialog))$/);
            if (match)
            {
                opener.itemId = match[2] || match[3];
                // if pageNr is not in the dialog id, check if the item is on the current page
                opener.pageNr = match[1] || apex.item(opener.itemId).element.length ? currentPageNr : null;
            }
            return opener.pageNr == currentPageNr ? apex.item(opener.itemId).element : $();
        }     
         
        // subscribe to dialog/popup open event as to suppress the dialog/popup when the related item is readonly
        let topApex = apex.util.getTopApex();
        let ta$ = topApex.jQuery;
        ta$(topApex.gPageContext$).off('popupopen.lib4x_ro dialogopen.lib4x_ro').on('popupopen.lib4x_ro dialogopen.lib4x_ro', function(jQueryEvent, data) { 
            let dialog$ = ta$(jQueryEvent.target).closest(DIALOG_SELECTOR);
            if (dialog$.length)
            {
                // the dialog/popup options do have a parentElement, however that one won't be correct when the page runs as a modal dialog 
                // so we determine ourselves the parentElement using the dialog id
                let parentElement$ = getDialogParentElement(jQueryEvent.target);   
                if ((parentElement$.hasClass(C_LIB4X_READONLY)) || (parentElement$.find(':first').hasClass(C_LIB4X_READONLY)))
                {
                    jQueryEvent.type == 'popupopen' ? dialog$.hide() : ta$(jQueryEvent.target).dialog('close');
                    parentElement$.focus();
                }
            }
        });         
    })();  

    // ==IG module
    let igModule = (function() 
    {
        // on apexendrecordedit, remove any highlight lib4x-readonly is-readonly settings
        // it will fire for IG's where the DA was executed (they have the C_LIB4X_READONLY_DA class)
        apex.gPageContext$.on('apexendrecordedit', '.' + C_LIB4X_READONLY_DA, function(jQueryEvent, data) {
            if (data?.recordId)
            {
                let recordId = data.recordId;
                let recMetadata = data.model.getRecordMetadata(recordId);
                if (recMetadata?.lib4x_ro && recMetadata.fields)
                {
                    for (const property in recMetadata.fields) 
                    {
                        let fieldMetadata = recMetadata.fields[property];
                        // remove any lib4x-readonly is-readonly class combination
                        if (fieldMetadata.highlight && fieldMetadata.highlight.includes(C_LIB4X_IS_READONLY))
                        {
                            fieldMetadata.highlight = fieldMetadata.highlight.replace(RE_LIB4X_READONLY, '').trim();
                            data.model.metadataChanged(recordId, property, "highlight");
                        }
                    }
                    delete recMetadata.lib4x_ro;
                }
            }
        })

        /*
         * toggleReadOnly
         * elements: comma-separated list of affected elements
         */
        function toggleReadOnly(action, elements, gridView)
        {
            gridView.view$.addClass(C_LIB4X_READONLY_DA);       
            let model = gridView.model;
            let recordId = gridView.getActiveRecordId();
            if (recordId)
            {
                let recMetadata = model.getRecordMetadata(recordId);
                if (!gridView.singleRowMode)    // grid view
                {
                    let gridColumns = gridView.view$.grid('getColumns');
                    elements.split(',').forEach(elementId => {
                        // find property (=column name) for elementId
                        let property = gridColumns.find(c=>c.elementId == elementId).property;
                        if (property)
                        {
                            // get fieldMetadata; default to empty object
                            let fieldMetadata = (recMetadata.fields ??= {})[property] ??= {};  
                            itemsModule.applyActionToApexItem(elementId, action, null);
                            // fieldMetadata.highlight property will be utilized to set/unset lib4x-readonly is-readonly class combination
                            if (action == ACTION_SET)
                            {
                                if (!fieldMetadata.ck)  // if ck is set, cell will be read-only already
                                {
                                    if (!fieldMetadata.highlight || !fieldMetadata.highlight.includes(C_LIB4X_IS_READONLY))
                                    {
                                        let cell$ = gridView.view$.grid('getActiveCellFromColumnItem', apex.item(elementId).node);
                                        if (cell$ && cell$.length)
                                        {                                        
                                            // check if fieldMetadata.highlight refers a highlight configuration (it will be a number)
                                            if (fieldMetadata.highlight && !isNaN(fieldMetadata.highlight))
                                            {
                                                // the actual class will be that number plus prefix 'hlc_' or 'hlr_'
                                                // to preserver the highlight class, take the class name from the cell
                                                let hlClass = Array.from(cell$[0].classList).find(cls => cls.includes(fieldMetadata.highlight));
                                                if (hlClass)
                                                {
                                                    // preserve the actual highlight class before adding the 'lib4x-readonly is-readonly' class combination
                                                    fieldMetadata.highlight = hlClass;
                                                }
                                            }
                                            if (cell$.hasClass(C_IS_ACTIVE))
                                            {
                                                // cell is active - we can only set it to readonly when it is not active, 
                                                // so we first have to deactivate for which there is only an internal method
                                                let gridInstance = gridView.view$.grid('instance');
                                                gridInstance._deactivateCell(cell$);
                                                // hide any date picker which might have popped up
                                                setTimeout(()=>{$('.ui-dialog-datepicker').hide();gridInstance.focus();}, 10);
                                            }
                                        }
                                        fieldMetadata.highlight = fieldMetadata.highlight ? fieldMetadata.highlight + ' ' + C_LIB4X_IS_READONLY : C_LIB4X_IS_READONLY;
                                        model.metadataChanged(recordId, property, "highlight");
                                        // set RO flag so we know in apexendrecordedit we need to remove any field highlight lib4x-readonly is-readonly 
                                        recMetadata.lib4x_ro = true;
                                    }
                                }
                            }
                            else if (fieldMetadata.highlight && fieldMetadata.highlight.includes(C_LIB4X_IS_READONLY))   // action 'UNSET'
                            {
                                // remove any lib4x-readonly is-readonly class combination
                                fieldMetadata.highlight = fieldMetadata.highlight.replace(RE_LIB4X_READONLY, '').trim();
                                model.metadataChanged(recordId, property, "highlight");
                            }   
                        }
                    });
                }
                else // single row view
                {
                    let rvFields = gridView.singleRowView$.recordView('getFields');
                    elements.split(',').forEach(elementId => {
                        // find property (=column/field name) for elementId
                        let property = rvFields.find(c=>c.elementId == elementId).property;
                        if (property)
                        {   
                            let container$ = gridView.singleRowView$.recordView('fieldElement', property);
                            itemsModule.applyActionToApexItem(elementId, action, container$);
                        }
                    }); 
                }
            }         
        }

        return{
            toggleReadOnly: toggleReadOnly
        }
    })();       

    // ==items module
    let itemsModule = (function() 
    {
        /*
         * toggleReadOnly
         * elements: comma-separated list of affected elements
         */
        function toggleReadOnly(action, elements)
        {
            elements.split(',').forEach(elementId => {
                let container$ = apex.item(elementId).element.closest('.' + C_T_FORM_FIELDCONTAINER);
                applyActionToApexItem(elementId, action, container$);
            });
        }

        // apply 'set' or 'unset' readonly action to an apex item
        // the field container is used in cases like an inline date picker as to block from pointer events
        function applyActionToApexItem(elementId, action, container$)
        {
            // make sure lib4x event handlers are triggered before apex event handlers
            // as to be really able to cancel them
            function prioritizeEventHandler(element, eventName)
            {
                // http://www.robeesworld.com/blog/67/changing-the-order-of-the-jquery-event-queue
                let eventList = $._data(element, "events");
                // to be sure, check if the last handler has lib4x namespace
                if (eventList)
                {
                    if (eventList[eventName].length > 1 && (eventList[eventName][eventList[eventName].length-1].namespace === 'lib4x'))
                    {
                        // take out last one and put as first one
                        eventList[eventName].unshift(eventList[eventName].pop());
                    }  
                }      
            }

            // enable or disable events like mousedown, keydown, click, dblclick to the elements as denoted by selector$
            function enableDisableEvents(isReadOnly, apexItem, selector$, events, prioritizeEvents, focusCondition)
            {
                let nsEvents = events.split(' ').map(event => `${event}.lib4x`).join(' ');
                if (isReadOnly)
                {
                    selector$.on(nsEvents, function(e) {
                        // only block interactive keys, let others like F1–F12, crl, etc. pass
                        let cancelKeyEvent = ((e.type === 'keydown') && (INTERACTIVE_KEYS.includes(e.key) || (e.key.length === 1 && !e.ctrlKey && !e.metaKey)));
                        if ((e.type !== 'keydown') || cancelKeyEvent)
                        {
                            e.preventDefault();
                            // stopImmediatePropagation: prevent apex event handlers getting triggered
                            e.stopImmediatePropagation();
                            // when an event like mousedown or click gets blocked, we might need to explicitly focus
                            if (focusCondition)
                            {
                                if (focusCondition.always || 
                                        ((!focusCondition.tagNames || focusCondition.tagNames.includes(e.target.tagName)) &&
                                        (!focusCondition.type || e.type == focusCondition.type)))
                                {
                                    apexItem.setFocus();
                                }
                                else if (focusCondition.callback)
                                {
                                    focusCondition.callback(e);
                                }
                            }
                        }
                    });
                    if (prioritizeEvents)
                    {
                        // make sure the handlers for these events will trigger first before apex event handlers get triggered
                        prioritizeEvents.split(' ').forEach(event => {  
                            selector$.each(function(){
                                prioritizeEventHandler(this, event);
                            });   
                        });
                    }
                }
                else
                {
                    selector$.off(nsEvents);
                }          
            }

            // set/unset aria-describedby attribute for accessibility support
            // used for items where the readonly attribute is not
            // supported by html
            // it bypasses the use of aria-readonly as it proved out that one 
            // is mostly not working, especially not in FF
            // the function takes care aria-describedby might have an existing value
            function toggleReadonlyDescribedBy(isReadonly, selector$) 
            {
                const existing = selector$.attr('aria-describedby') || '';
                const ids = existing.trim().split(/\s+/).filter(Boolean);
                const hasNote = ids.includes('lib4x_aria_readonly_note');
              
                if (isReadonly && !hasNote) 
                {
                    ids.push('lib4x_aria_readonly_note');
                    selector$.attr('aria-describedby', ids.join(' '));
                } 
                else if (!isReadonly && hasNote) 
                {
                    const updated = ids.filter(id => id !== 'lib4x_aria_readonly_note');
                    if (updated.length) 
                    {
                        selector$.attr('aria-describedby', updated.join(' '));
                    } 
                    else 
                    {
                        selector$.removeAttr('aria-describedby');
                    }
                }
            }            

            // as per the type of item, the below logic takes the needed steps to
            // block UI interaction with the item except for setting focus
            let apexItem = apex.item(elementId);
            let element$ = apex.item(elementId).element;
            let itemType = apex.item(elementId).item_type;
            let nodeName = element$.prop('nodeName');   // nodeName will give uppercase result
            let isRo = action == ACTION_SET;
            // for item plugins, in case the below default behavior is not sufficient, 
            // dedicated methods setReadOnly()/UnsetReadOnly() can be used on the item interface
            if ((typeof apexItem.setReadOnly === 'function') && (typeof apexItem.UnsetReadOnly === 'function'))
            {
                isRo ? apexItem.setReadOnly() : apexItem.UnsetReadOnly();
            }
            else if ((itemType == "TEXT") || (itemType == "TEXTAREA") || (itemType == "NUMBER"))
            {
                element$.prop('readonly', isRo);
                isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);    // used for styling
                // Markdown Editor also has type 'TEXTAREA'
                if (element$.hasClass(C_MARKDOWN_EDITOR))
                {
                    let me$ = element$.closest('.' + C_ITEM_MARKDOWN_EDITOR);
                    let meToolbar$ = me$.find('.' + C_MDE_TOOLBAR);
                    /* setting preview mode gives formatting issues when coming from another tab
                    let actionsContext = meToolbar$.toolbar('option').actionsContext;
                    if (!actionsContext.get('preview') === isRo)
                    {
                        actionsContext.toggle('preview');
                    }
                    let previewPanel$ = me$.find('.a-MDEditor-previewPanel');
                    isRo ? previewPanel$.addClass(C_LIB4X_READONLY) : previewPanel$.removeClass(C_LIB4X_READONLY);    // used for styling
                    */
                    isRo ? meToolbar$.addClass(C_LIB4X_DISABLED) : meToolbar$.removeClass(C_LIB4X_DISABLED);
                    isRo ? me$.find('button').prop('disabled', true) : me$.find('button').prop('disabled', false);
                    // note: in preview mode, the ME won't receive focus
                }
            }
            // for date picker, check for nodeName as itemType can vary
            else if (nodeName == 'A-DATE-PICKER')   // nodeName will give uppercase result
            {
                apexItem.readonly = isRo;   // date picker is a webcomponent; has a readonly setting (but is not blocking the date picker popup from setting a date value)
                // APEX is setting the readonly attr on the input element
                element$.find('button.' + C_BUTTON_CAL).prop('disabled', isRo);
                // the pageModule has code as to prevent the calendar popup in case of readonly
                if ((apexItem.displayAs?.toUpperCase() == 'INLINE') && container$)
                {
                    // block inline date picker from pointer events
                    isRo ? container$.addClass(C_LIB4X_DISABLED) : container$.removeClass(C_LIB4X_DISABLED);
                }
                // C_LIB4X_READONLY on element$ will block date picker dialog/popup; also used for styling child elements
                isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);
                let input$ = element$.find('input');
                toggleReadonlyDescribedBy(isRo, input$);
            }
            else if (itemType == "SELECT")
            {
                isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);    // used for styling 
                toggleReadonlyDescribedBy(isRo, element$);
                enableDisableEvents(isRo, apexItem, element$, 'mousedown keydown', null, {type: 'mousedown'});
                // list manager
                if (element$.hasClass(C_LISTMANAGER))
                {
                    let fieldSet$ = element$.closest('.' + C_FIELDSET_LISTMANAGER);
                    let popupLovItem$ = fieldSet$.find('.' + C_ITEM_POPUP_LOV);
                    isRo ? popupLovItem$.addClass(C_LIB4X_READONLY) : popupLovItem$.removeClass(C_LIB4X_READONLY); 
                    let buttons$ = fieldSet$.find('button, input[type="button"]');
                    isRo ? buttons$.prop('disabled', true) : buttons$.prop('disabled', false);
                    enableDisableEvents(isRo, apexItem, popupLovItem$, 'keydown', null, null);
                }
            }
            // regarding popup lov, check for class as item_type can vary
            else if (element$.hasClass(C_ITEM_POPUP_LOV))
            {
                if (element$.closest('.'+ C_ITEM_MULTI).length)
                {
                    // add C_LIB4X_READONLY to block popup
                    isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY); 
                    let itemGroup$ = element$.closest('.' + C_ITEM_GROUP_POPUP_LOV);
                    isRo ? itemGroup$.addClass(C_LIB4X_READONLY) : itemGroup$.removeClass(C_LIB4X_READONLY); 
                    isRo ? itemGroup$.find('button').prop('disabled', true) : itemGroup$.find('button').prop('disabled', false);
                    let input$ = itemGroup$.find('input');
                    input$.prop('readonly', isRo);
                    toggleReadonlyDescribedBy(isRo, input$);
                    let lovButton$ = itemGroup$.find('button.' + C_BUTTON_LOV);
                    lovButton$.prop('disabled', isRo);
                    isRo ? lovButton$.addClass(C_LIB4X_READONLY) : lovButton$.removeClass(C_LIB4X_READONLY);                    
                    let selector$ = itemGroup$.add(element$.find(':input, span, div'));
                    enableDisableEvents(isRo, apexItem, selector$, 'click mousedown keydown', 'click mousedown keydown', {type: 'mousedown'});                      
                }     
                else
                {           
                    // adding C_LIB4X_READONLY so the dialog/popup will be suppressed; class also used for styling
                    isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);
                    // if manual entry not enabled, element will have been set to readonly by APEX
                    if (element$.attr('name'))  // manual entry will be enabled
                    {
                        element$.prop('readonly', isRo);
                    }
                    toggleReadonlyDescribedBy(isRo, element$);
                    let lovButton$ = element$.parent().find('button.' + C_BUTTON_LOV);
                    lovButton$.prop('disabled', isRo);
                    isRo ? lovButton$.addClass(C_LIB4X_READONLY) : lovButton$.removeClass(C_LIB4X_READONLY);
                }
            }
            // a switch is 'CHECKBOX'
            else if ((itemType == 'CHECKBOX_GROUP') || (itemType == 'RADIO_GROUP') || (itemType == 'SINGLE_CHECKBOX') || (itemType == 'CHECKBOX'))
            {
                // for the Switch, also prevent on child and parent span
                let selector$ = element$.add(element$.parent().find('.' + C_SWITCH_TOGGLE)).add(element$.closest('.' + C_ITEM_SWITCH));
                enableDisableEvents(isRo, apexItem, selector$, 'click keydown', 'click', null);
                let roElement$ = element$.closest(F_CHOICE_CLASSES);
                isRo ? roElement$.addClass(C_LIB4X_READONLY) : roElement$.removeClass(C_LIB4X_READONLY);
                let input$ = element$.find('input').addBack('input');
                toggleReadonlyDescribedBy(isRo, input$);            
            }
            else if (itemType === 'SHUTTLE')
            {
                let selects$ = element$.find('select');
                isRo ? selects$.addClass(C_LIB4X_READONLY) : selects$.removeClass(C_LIB4X_READONLY);    // can be used for styling
                toggleReadonlyDescribedBy(isRo, selects$);
                if (isRo)
                {
                    selects$.find('option:selected').prop('selected', false);
                }
                enableDisableEvents(isRo, apexItem, element$.find(':input, span'), 'mousedown click dblclick keydown',
                                        'keydown dblclick', {tagNames: 'SELECT OPTION', type: 'mousedown'});
                isRo ? element$.find('button').prop('disabled', true) : element$.find('button').prop('disabled', false);             
            }
            else if (element$.hasClass(C_ITEM_STARRATING))
            {
                enableDisableEvents(isRo, apexItem, element$.find(':input, span'), 'click keydown', null, {type: 'click'});
                element$.find(':input').prop('readonly', isRo);
                toggleReadonlyDescribedBy(isRo, element$.find(':input'));
            }
            else if (itemType == 'AUTOCOMPLETE')
            {
                isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);
                let input$ = element$.find('input');
                toggleReadonlyDescribedBy(isRo, input$);
                let wrapperElement$ = element$.find('input.' + C_ITEM_AUTOCOMPLETE);
                wrapperElement$.prop('readonly', isRo);              
            }
            else if ((itemType == 'COLOR_PICKER') && (apexItem.displayAs?.toUpperCase() != 'COLOR_ONLY') && (apexItem.displayAs?.toUpperCase() != 'NATIVE'))
            {
                element$.find('button.' + C_BUTTON_CP).prop('disabled', isRo);
                isRo ? element$.addClass(C_LIB4X_READONLY) : element$.removeClass(C_LIB4X_READONLY);
                let wrapperElement$ = element$.find('input.' + C_ITEM_COLOR_PICKER);
                wrapperElement$.prop('readonly', isRo);
                if ((apexItem.displayAs?.toUpperCase() == 'INLINE') && container$)
                {
                    isRo ? container$.addClass(C_LIB4X_DISABLED) : container$.removeClass(C_LIB4X_DISABLED);
                }                     
            }
            else if ((itemType == 'RICH_TEXT_EDITOR') && (typeof apexItem.getEditor === 'function') && (typeof apexItem.getEditor().enableReadOnlyMode === 'function'))
            {
                isRo ? apexItem.getEditor().enableReadOnlyMode(C_LIB4X_READONLY) : apexItem.getEditor().disableReadOnlyMode(C_LIB4X_READONLY);
                let ckEditor$ = element$.parent().find('.' + C_CK_EDITOR);
                isRo ? ckEditor$.addClass(C_LIB4X_READONLY) : ckEditor$.removeClass(C_LIB4X_READONLY);
            }
            else if (nodeName == 'A-SELECT')    // select one/many (SEARCHABLE_SELECT)
            {
                isRo ? element$.find('button').prop('disabled', true) : element$.find('button').prop('disabled', false);
                let dashedElement$ = apexItem.multiValue ? element$.find('.' + C_ITEM_COMBOSELECT) : element$.find('input');
                let input$ = element$.find('input');
                input$.prop('readonly', isRo);
                toggleReadonlyDescribedBy(isRo, input$);
                isRo ? dashedElement$.addClass(C_LIB4X_READONLY) : dashedElement$.removeClass(C_LIB4X_READONLY); 
                let selector$ = element$.add(element$.find(':input, span, div'));
                enableDisableEvents(isRo, apexItem, selector$, 'click mousedown keydown', 'click mousedown keydown', {type: 'mousedown'});                   
            }
            else if (itemType == 'COMBOBOX')
            {
                let dashedElement$ = apexItem.multiValue ? element$.find('.' + C_ITEM_COMBOSELECT) : element$.find('input');
                isRo ? dashedElement$.addClass(C_LIB4X_READONLY) : dashedElement$.removeClass(C_LIB4X_READONLY);  
                let input$ = element$.find('input'); 
                input$.prop('readonly', isRo);  // this isn't enough for a screenreader like NVDA as there is also a role attribute
                toggleReadonlyDescribedBy(isRo, input$);
                let selector$ = element$.add(element$.find(':input, span, div'));
                enableDisableEvents(isRo, apexItem, selector$, 'click mousedown keydown', 'click mousedown keydown', {type: 'mousedown'});
            }
            else
            {
                if (container$)
                {
                    // as the item type is unknown here, we put the disabled class to the container as to block pointer events
                    isRo ? container$.addClass(C_LIB4X_DISABLED) : container$.removeClass(C_LIB4X_DISABLED);
                }
            }
            if (container$)
            {
                let quickPicks$ = container$.find('.apex-quick-picks');
                isRo ? quickPicks$.hide() : quickPicks$.show();
            }
        }        

        return{
            applyActionToApexItem: applyActionToApexItem,
            toggleReadOnly: toggleReadOnly
        }
    })();    

    // using this span with aria-describedby in many places as aria-readonly is not always 
    // working, especially not with Firefox
    function addReadOnlySpan()
    {
        if (!$('#lib4x_aria_readonly_note').length) 
        {
            $('<span>', {
                id: 'lib4x_aria_readonly_note',
                text: 'read-only',
                class: 'lib4x-visually-hidden'
            }).appendTo('body');   
        }     
    }
    
    // called by the LIB4X - Unset/Set Read-Only DA 
    let toggle = function()
    {
        // this.affectedElements: jQuery object with set of affected DOM elements
        // this.action.affectedElements: string with comma-separated list of element ID's
        addReadOnlySpan();
        let daThis = this;
        let action = null;
        if (daThis.action.action.includes('.SET_READONLY'))
        {
            action = ACTION_SET;
        }
        else if (daThis.action.action.includes('.UNSET_READONLY'))
        {
            action = ACTION_UNSET;
        }
        if (daThis.action.affectedElementsType == "COLUMN")
        {
            let gridView = daThis.affectedElements.first().closest('.a-IG').interactiveGrid('getViews', 'grid');
            igModule.toggleReadOnly(action, daThis.action.affectedElements, gridView);
        }
        else if (daThis.action.affectedElementsType == "ITEM")
        {
            itemsModule.toggleReadOnly(action, daThis.action.affectedElements);
        }
    }

    return{
        toggle: toggle
    }    
})(apex.jQuery);      
