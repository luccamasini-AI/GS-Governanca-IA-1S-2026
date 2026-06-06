import argparse
import json
import random
import sqlite3
import time
from datetime import datetime, timezone


TOPIC = "astroagro/sensores"


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def calculate_risk(sample, previous_soil):
    dry_score = clamp((45 - sample["soil_moisture"]) * 1.8, 0, 45)
    heat_score = clamp((sample["air_temperature"] - 28) * 2.3, 0, 25)
    light_score = clamp((sample["luminosity"] - 65) * 0.35, 0, 12)
    orbital_score = sample["orbital_index"] * 14
    trend_score = 8 if previous_soil is not None and sample["soil_moisture"] < previous_soil - 2 else 0
    score = clamp(dry_score + heat_score + light_score + orbital_score + trend_score, 0, 100)

    if sample["water_level"] < 20 or (sample["irrigation_active"] and not sample["flow_detected"]):
        state = "Falha Operacional"
    elif sample["irrigation_active"]:
        state = "Irrigação Ativa"
    elif sample["soil_moisture"] < 25 and sample["air_temperature"] > 34 and sample["luminosity"] > 75:
        state = "Crítico"
    elif sample["soil_moisture"] < 35 or sample["air_temperature"] > 32:
        state = "Atenção"
    else:
        state = "Normal"

    if score >= 70:
        level = "alto"
        recommendation = "Enviar alerta e irrigar se houver água disponível."
    elif score >= 40:
        level = "médio"
        recommendation = "Monitorar tendência e preparar irrigação preventiva."
    else:
        level = "baixo"
        recommendation = "Manter monitoramento."

    if sample["water_level"] < 20:
        recommendation = "Economizar água e verificar o reservatório antes de irrigar."

    return score, level, state, recommendation


def generate_sample(sequence, scenario, previous_soil):
    if scenario == "critical":
        soil = random.uniform(14, 28)
        temperature = random.uniform(34, 39)
        luminosity = random.uniform(78, 95)
        water_level = random.uniform(22, 65)
        orbital_index = random.uniform(0.72, 0.95)
    elif scenario == "failure":
        soil = random.uniform(18, 32)
        temperature = random.uniform(31, 37)
        luminosity = random.uniform(65, 90)
        water_level = random.uniform(5, 18)
        orbital_index = random.uniform(0.55, 0.88)
    else:
        soil = random.uniform(38, 62)
        temperature = random.uniform(24, 31)
        luminosity = random.uniform(35, 72)
        water_level = random.uniform(45, 90)
        orbital_index = random.uniform(0.15, 0.55)

    irrigation = scenario in ("critical", "failure") and soil < 24 and water_level >= 20
    flow_detected = False if scenario == "failure" else irrigation or random.random() > 0.05
    sample = {
        "device_id": "astroagro-sim-01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "soil_moisture": round(soil, 1),
        "air_temperature": round(temperature, 1),
        "air_humidity": round(random.uniform(42, 78), 1),
        "luminosity": round(luminosity, 1),
        "water_level": round(water_level, 1),
        "flow_detected": flow_detected,
        "irrigation_active": irrigation,
        "orbital_index": round(orbital_index, 2),
        "sequence": sequence,
    }
    score, level, state, recommendation = calculate_risk(sample, previous_soil)
    sample["risk_score"] = round(score, 1)
    sample["risk_level"] = level
    sample["application_state"] = state
    sample["recommendation"] = recommendation
    return sample


def init_db(path):
    connection = sqlite3.connect(path)
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            device_id TEXT NOT NULL,
            soil_moisture REAL NOT NULL,
            air_temperature REAL NOT NULL,
            air_humidity REAL NOT NULL,
            luminosity REAL NOT NULL,
            water_level REAL NOT NULL,
            flow_detected INTEGER NOT NULL,
            irrigation_active INTEGER NOT NULL,
            orbital_index REAL NOT NULL,
            risk_score REAL NOT NULL,
            risk_level TEXT NOT NULL,
            application_state TEXT NOT NULL,
            recommendation TEXT NOT NULL
        )
        """
    )
    return connection


def save_sample(connection, sample):
    connection.execute(
        """
        INSERT INTO telemetry (
            device_id, soil_moisture, air_temperature, air_humidity, luminosity,
            water_level, flow_detected, irrigation_active, orbital_index,
            risk_score, risk_level, application_state, recommendation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            sample["device_id"],
            sample["soil_moisture"],
            sample["air_temperature"],
            sample["air_humidity"],
            sample["luminosity"],
            sample["water_level"],
            int(sample["flow_detected"]),
            int(sample["irrigation_active"]),
            sample["orbital_index"],
            sample["risk_score"],
            sample["risk_level"],
            sample["application_state"],
            sample["recommendation"],
        ),
    )
    connection.commit()


def build_mqtt_client(host, port):
    try:
        import paho.mqtt.client as mqtt
    except ImportError as exc:
        raise SystemExit("Instale paho-mqtt para publicar via MQTT: python -m pip install paho-mqtt") from exc

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(host, port, 60)
    client.loop_start()
    return client


def main():
    parser = argparse.ArgumentParser(description="Simulador de telemetria do AstroAgro Sentinel.")
    parser.add_argument("--mqtt-host", help="Host do broker MQTT. Se omitido, imprime apenas no console.")
    parser.add_argument("--mqtt-port", type=int, default=1883)
    parser.add_argument("--sqlite", help="Caminho opcional para gravar as amostras em SQLite.")
    parser.add_argument("--interval", type=float, default=2.0)
    parser.add_argument("--samples", type=int, default=0, help="Quantidade de amostras. 0 executa continuamente.")
    parser.add_argument("--scenario", choices=["normal", "critical", "failure", "mixed"], default="mixed")
    args = parser.parse_args()

    mqtt_client = build_mqtt_client(args.mqtt_host, args.mqtt_port) if args.mqtt_host else None
    db = init_db(args.sqlite) if args.sqlite else None
    previous_soil = None
    sequence = 1

    try:
        while args.samples == 0 or sequence <= args.samples:
            scenario = args.scenario
            if scenario == "mixed":
                scenario = random.choice(["normal", "normal", "critical", "failure"])
            sample = generate_sample(sequence, scenario, previous_soil)
            previous_soil = sample["soil_moisture"]
            payload = json.dumps(sample, ensure_ascii=False)

            if mqtt_client:
                mqtt_client.publish(TOPIC, payload)
            if db:
                save_sample(db, sample)

            print(payload)
            sequence += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nSimulador encerrado.")
    finally:
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        if db:
            db.close()


if __name__ == "__main__":
    main()
