function render 
  ( p_dynamic_action in apex_plugin.t_dynamic_action
  , p_plugin         in apex_plugin.t_plugin )
return apex_plugin.t_dynamic_action_render_result
as

l_result     apex_plugin.t_dynamic_action_render_result;
  
begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action(p_plugin         => p_plugin,
                                              p_dynamic_action => p_dynamic_action);
    end if;    

    apex_javascript.add_library(
          p_name      => 'lib4x-readonly',
          p_check_to_add_minified => true,
          --p_directory => '#WORKSPACE_FILES#javascript/',
          p_directory => p_plugin.file_prefix || 'js/',
          p_version   => NULL
    ); 

    apex_css.add_file (
        p_name => 'lib4x-readonly'||case when v('DEBUG') = 'NO' then '.min' end,        
        --p_directory => '#WORKSPACE_FILES#css/'
        p_directory => p_plugin.file_prefix || 'css/' 
    );

    l_result.javascript_function := 'lib4x.axt.readonly.toggle';
    
    return l_result;
    
end render;
