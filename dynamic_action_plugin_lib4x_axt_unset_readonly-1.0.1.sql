prompt --application/set_environment
set define off verify off feedback off
whenever sqlerror exit sql.sqlcode rollback
--------------------------------------------------------------------------------
--
-- Oracle APEX export file
--
-- You should run this script using a SQL client connected to the database as
-- the owner (parsing schema) of the application or as a database user with the
-- APEX_ADMINISTRATOR_ROLE role.
--
-- This export file has been automatically generated. Modifying this file is not
-- supported by Oracle and can lead to unexpected application and/or instance
-- behavior now or in the future.
--
-- NOTE: Calls to apex_application_install override the defaults below.
--
--------------------------------------------------------------------------------
begin
wwv_flow_imp.import_begin (
 p_version_yyyy_mm_dd=>'2024.11.30'
,p_release=>'24.2.0'
,p_default_workspace_id=>17062793957969100
,p_default_application_id=>138
,p_default_id_offset=>17513279999319301
,p_default_owner=>'CMF'
);
end;
/
 
prompt APPLICATION 138 - PKX
--
-- Application Export:
--   Application:     138
--   Name:            PKX
--   Date and Time:   03:49 Wednesday February 4, 2026
--   Exported By:     KAREL
--   Flashback:       0
--   Export Type:     Component Export
--   Manifest
--     PLUGIN: 12165699450375192
--   Manifest End
--   Version:         24.2.0
--   Instance ID:     800104173856312
--

begin
  -- replace components
  wwv_flow_imp.g_mode := 'REPLACE';
end;
/
prompt --application/shared_components/plugins/dynamic_action/lib4x_axt_unset_readonly
begin
wwv_flow_imp_shared.create_plugin(
 p_id=>wwv_flow_imp.id(12165699450375192)
,p_plugin_type=>'DYNAMIC ACTION'
,p_name=>'LIB4X.AXT.UNSET_READONLY'
,p_display_name=>'LIB4X - Unset Read-Only'
,p_category=>'COMPONENT'
,p_plsql_code=>wwv_flow_string.join(wwv_flow_t_varchar2(
'function render ',
'  ( p_dynamic_action in apex_plugin.t_dynamic_action',
'  , p_plugin         in apex_plugin.t_plugin )',
'return apex_plugin.t_dynamic_action_render_result',
'as',
'',
'l_result     apex_plugin.t_dynamic_action_render_result;',
'  ',
'begin',
'    if apex_application.g_debug then',
'        apex_plugin_util.debug_dynamic_action(p_plugin         => p_plugin,',
'                                              p_dynamic_action => p_dynamic_action);',
'    end if;    ',
'',
'    -- sources/css will be loaded by the Set plugin',
'',
'    l_result.javascript_function := ''lib4x.axt.readonly.toggle'';',
'    ',
'    return l_result;',
'    ',
'end render;'))
,p_api_version=>1
,p_render_function=>'render'
,p_standard_attributes=>'ITEM:REQUIRED:ONLOAD'
,p_substitute_attributes=>true
,p_version_scn=>441666779
,p_subscribe_plugin_settings=>true
,p_help_text=>'Unset the Read-Only mode for Column Item(s) or regular Page Item(s).'
,p_version_identifier=>'1.0.1'
,p_about_url=>'https://github.com/kekema/apex-dynamic-readonly'
,p_files_version=>5
);
end;
/
prompt --application/end_environment
begin
wwv_flow_imp.import_end(p_auto_install_sup_obj => nvl(wwv_flow_application_install.get_auto_install_sup_obj, false)
);
commit;
end;
/
set verify on feedback on define on
prompt  ...done
