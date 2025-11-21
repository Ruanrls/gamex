use std::collections::HashMap;
use std::process::Child;
use std::sync::Mutex;
use tauri::{async_runtime, AppHandle, Manager, RunEvent};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

// Process manager to track all spawned child processes
struct ProcessManager {
    game_processes: Mutex<Vec<Child>>,
    ipfs_process: Mutex<Option<CommandChild>>,
}

impl ProcessManager {
    fn new() -> Self {
        Self {
            game_processes: Mutex::new(Vec::new()),
            ipfs_process: Mutex::new(None),
        }
    }

    fn add_game_process(&self, child: Child) {
        if let Ok(mut processes) = self.game_processes.lock() {
            processes.push(child);
            println!(
                "[ProcessManager] Added game process. Total tracked: {}",
                processes.len()
            );
        }
    }

    fn set_ipfs_process(&self, child: CommandChild) {
        if let Ok(mut ipfs) = self.ipfs_process.lock() {
            *ipfs = Some(child);
            println!("[ProcessManager] IPFS process tracked");
        }
    }

    fn kill_all(&self) {
        // Kill game processes
        if let Ok(mut processes) = self.game_processes.lock() {
            println!(
                "[ProcessManager] Killing {} game processes",
                processes.len()
            );
            for child in processes.iter_mut() {
                if let Err(e) = child.kill() {
                    eprintln!("[ProcessManager] Failed to kill game process: {}", e);
                } else {
                    println!("[ProcessManager] Successfully killed game process");
                }
            }
            processes.clear();
        }

        // Shutdown IPFS daemon by sending SIGTERM on Unix or taskkill on Windows
        if let Ok(mut ipfs) = self.ipfs_process.lock() {
            if let Some(child) = ipfs.take() {
                println!("[ProcessManager] Shutting down IPFS daemon");

                let pid = child.pid();
                println!("[ProcessManager] IPFS daemon PID: {}", pid);

                #[cfg(unix)]
                {
                    // On Unix (macOS/Linux), send SIGTERM for graceful shutdown
                    use std::process::Command;
                    match Command::new("kill")
                        .args(["-TERM", &pid.to_string()])
                        .output()
                    {
                        Ok(output) => {
                            if output.status.success() {
                                println!("[ProcessManager] Sent SIGTERM to IPFS daemon");
                            } else {
                                eprintln!("[ProcessManager] Failed to send SIGTERM: {:?}", output);
                            }
                        }
                        Err(e) => {
                            eprintln!("[ProcessManager] Failed to execute kill command: {}", e);
                        }
                    }
                }

                #[cfg(windows)]
                {
                    // On Windows, use taskkill
                    use std::process::Command;
                    match Command::new("taskkill")
                        .args(["/PID", &pid.to_string(), "/T"])
                        .output()
                    {
                        Ok(output) => {
                            if output.status.success() {
                                println!("[ProcessManager] Sent taskkill to IPFS daemon");
                                std::thread::sleep(std::time::Duration::from_millis(500));
                            } else {
                                eprintln!("[ProcessManager] Failed to taskkill: {:?}", output);
                            }
                        }
                        Err(e) => {
                            eprintln!("[ProcessManager] Failed to execute taskkill: {}", e);
                        }
                    }
                }

                // Force kill if still running
                let _ = child.kill();
                println!("[ProcessManager] IPFS daemon cleanup completed");
            }
        }
    }
}

#[tauri::command]
fn execute_game(path: String, app_handle: AppHandle) -> Result<String, String> {
    println!("[Tauri] Executing game at path: {}", path);

    let process_manager = app_handle.state::<ProcessManager>();

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let child = Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to execute game: {}", e))?;

        process_manager.add_game_process(child);
        Ok(format!("Game launched: {}", path))
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        // On macOS, we need to make the file executable first
        Command::new("chmod")
            .args(["+x", &path])
            .output()
            .map_err(|e| format!("Failed to set executable permission: {}", e))?;

        let child = Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to execute game: {}", e))?;

        process_manager.add_game_process(child);
        Ok(format!("Game launched: {}", path))
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // On Linux, we need to make the file executable first
        Command::new("chmod")
            .args(["+x", &path])
            .output()
            .map_err(|e| format!("Failed to set executable permission: {}", e))?;

        let child = Command::new(&path)
            .spawn()
            .map_err(|e| format!("Failed to execute game: {}", e))?;

        process_manager.add_game_process(child);
        Ok(format!("Game launched: {}", path))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ProcessManager::new())
        .invoke_handler(tauri::generate_handler![execute_game])
        .setup(|app| {
            println!("[Tauri] Initializing IPFS...");

            let app_handle = app.handle().clone();

            async_runtime::spawn(async move {
                // Get app data directory
                let app_data_dir = app_handle.path().app_data_dir().unwrap();
                let ipfs_path = app_data_dir.join(".ipfs");
                println!("[Tauri] IPFS_PATH: {:?}", ipfs_path.to_string_lossy().to_string());

                println!("[Tauri] Creating folder if it does not exist...");
                // Create the .ipfs directory if it doesn't exist
                if !ipfs_path.exists() {
                    std::fs::create_dir_all(&ipfs_path).unwrap();
                    println!("[Tauri] Created IPFS_PATH directory at {:?}", ipfs_path.to_string_lossy().to_string());
                }

                // Create environment variables
                let mut env = HashMap::new();
                env.insert("IPFS_PATH".to_string(), ipfs_path.to_string_lossy().to_string());

                let shell = app_handle.shell();

                let cors_commands = vec![
                    vec!["config", "API.HTTPHeaders.Access-Control-Allow-Origin", "[\"http://localhost:3000\", \"http://localhost:1420\", \"tauri://localhost\", \"https://webui.ipfs.io\", \"http://127.0.0.1:5001\"]", "--json"],
                    vec!["config", "API.HTTPHeaders.Access-Control-Allow-Methods", "[\"PUT\", \"POST\", \"GET\"]", "--json"],
                ];

                for cors_rule in cors_commands {
                    shell.sidecar("ipfs").unwrap().args(cors_rule).envs(env.clone()).output().await.unwrap();
                }

                // Spawn IPFS daemon
                println!("[Tauri] Starting IPFS daemon...");
                let sidecar_command = shell.sidecar("ipfs").unwrap()
                    .args(["daemon",
                    // "--offline",
                    "--init"])
                    .envs(env);

                match sidecar_command.spawn() {
                    Ok((_rx, child)) => {
                        println!("[Tauri] IPFS daemon spawned successfully!");
                        let process_manager = app_handle.state::<ProcessManager>();
                        process_manager.set_ipfs_process(child);
                    },
                    Err(e) => println!("[Tauri] Failed to spawn IPFS daemon: {}", e),
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                println!("[Tauri] Exit requested, cleaning up processes...");
                let process_manager = app_handle.state::<ProcessManager>();
                process_manager.kill_all();
                println!("[Tauri] All processes cleaned up, exiting...");
            }
        });
}
