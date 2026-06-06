import os
import json
import tempfile
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict



# Mapeando dinamicamente a raiz do repositório (subindo 2 níveis a partir de shared_infra)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

def load_system_config():
    config_path = ROOT_DIR / "config" / "system.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

_sys_cfg = load_system_config()

class Settings(BaseSettings):
    """
    Configuração Central: 
    O Pydantic centraliza a gestão de segredos e URLs, garantindo que o sistema 
    seja portável entre ambientes (Dev, Staging, Produção).
    """
    # Identidade do Sistema lida do JSON
    system_name: str = _sys_cfg.get("system_name", "Digital Twin Platform")
    branding: dict = _sys_cfg.get("branding", {})
    
    # Seletor de Perfil: Define qual motor o sistema está simulando/monitorando no momento
    active_motor_profile: str = os.getenv("ACTIVE_MOTOR_PROFILE", "example_profile")
    

    
    # Armazenamento de Arquivos (Manuais, Schematics e PDFs)
    r2_access_key_id: str = os.getenv("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    r2_endpoint_url: str = os.getenv("R2_ENDPOINT_URL", "")
    r2_bucket_name: str = os.getenv("R2_BUCKET_NAME", "digitaltwin-manuals")
    
    # Política de CORS para segurança do Frontend
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "*")

    @property
    def specs(self):
        """
        Mock da especificação técnica.
        """
        return {}

    @property
    def cmapss_database_path(self) -> str:
        """Banco C-MAPSS resolvido relativamente: ROOT_DIR.parent / data-base."""
        return str(ROOT_DIR.parent / "data-base" / "cmapss_dataset.sqlite")

    @property
    def temp_reports_dir(self) -> str:
        """Diretório temporário do SO para relatórios antes do download."""
        output = Path(tempfile.gettempdir()) / "agent_rpa_reports"
        output.mkdir(parents=True, exist_ok=True)
        return str(output)

    @property
    def logs_dir(self) -> str:
        """Logs de auditoria RPA em diretório relativo ao projeto."""
        output = ROOT_DIR / "api" / "outputs"
        output.mkdir(parents=True, exist_ok=True)
        return str(output)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

# Singleton global para acesso centralizado às configurações
settings = Settings()


