
import { useEffect, useState } from 'react';
import { Save, Settings, RotateCcw } from 'lucide-react';
import { db } from '../database/db';

type ConfigValues = {
  energyPrice: string;
  defaultPlaPrice: string;
  defaultPetgPrice: string;
  retailStorePercentage: string;
  defaultMultiplier: string;
};

const initialValues: ConfigValues = {
  energyPrice: '0.78',
  defaultPlaPrice: '110',
  defaultPetgPrice: '110',
  retailStorePercentage: '50',
  defaultMultiplier: '3',
};

export default function Configuracoes() {
  const [values, setValues] = useState<ConfigValues>(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const keys = Object.keys(initialValues) as (keyof ConfigValues)[];

      const settings = await Promise.all(
        keys.map((key) => db.settings.get(key))
      );

      const loaded = { ...initialValues };

      keys.forEach((key, index) => {
        const value = settings[index]?.value;

        if (value !== undefined) {
          loaded[key] = String(value);
        }
      });

      setValues(loaded);
      setLoading(false);
    }

    loadSettings();
  }, []);

  function updateValue(key: keyof ConfigValues, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveSettings() {
    const energy = Number(values.energyPrice);
    const pla = Number(values.defaultPlaPrice);
    const petg = Number(values.defaultPetgPrice);
    const store = Number(values.retailStorePercentage);
    const multiplier = Number(values.defaultMultiplier);

    if (
      !Number.isFinite(energy) || energy < 0 ||
      !Number.isFinite(pla) || pla < 0 ||
      !Number.isFinite(petg) || petg < 0 ||
      !Number.isFinite(store) || store < 0 || store > 100 ||
      ![2, 3, 4, 5].includes(multiplier)
    ) {
      alert('Confira os valores informados antes de salvar.');
      return;
    }

    setSaving(true);

    try {
      await db.settings.bulkPut([
        { key: 'energyPrice', value: energy },
        { key: 'defaultPlaPrice', value: pla },
        { key: 'defaultPetgPrice', value: petg },
        { key: 'retailStorePercentage', value: store },
        { key: 'defaultMultiplier', value: multiplier },
      ]);

      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  }

  function restoreDefaults() {
    setValues(initialValues);
  }

  if (loading) {
    return <div className="panel">Carregando configurações...</div>;
  }

  return (
    <div className="settings-page">
      <div className="panel settings-panel">
        <div className="settings-title">
          <div className="quick-icon">
            <Settings size={23} />
          </div>
          <div>
            <h2>Configurações gerais</h2>
            <p>Defina os valores padrão utilizados no sistema.</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <label>Energia elétrica (R$/kWh)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.energyPrice}
              onChange={(e) => updateValue('energyPrice', e.target.value)}
            />
            <small>Tarifa utilizada para estimar o custo de energia.</small>
          </div>

          <div className="settings-field">
            <label>Filamento PLA (R$/kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.defaultPlaPrice}
              onChange={(e) => updateValue('defaultPlaPrice', e.target.value)}
            />
            <small>Preço padrão sugerido ao cadastrar novos rolos de PLA.</small>
          </div>

          <div className="settings-field">
            <label>Filamento PETG (R$/kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.defaultPetgPrice}
              onChange={(e) => updateValue('defaultPetgPrice', e.target.value)}
            />
            <small>Preço padrão sugerido ao cadastrar novos rolos de PETG.</small>
          </div>

          <div className="settings-field">
            <label>Preço para lojista (% do preço consumidor)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={values.retailStorePercentage}
              onChange={(e) =>
                updateValue('retailStorePercentage', e.target.value)
              }
            />
            <small>Exemplo: 50 significa metade do preço consumidor.</small>
          </div>

          <div className="settings-field">
            <label>Multiplicador padrão de venda</label>
            <select
              value={values.defaultMultiplier}
              onChange={(e) =>
                updateValue('defaultMultiplier', e.target.value)
              }
            >
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="4">4x</option>
              <option value="5">5x</option>
            </select>
            <small>Multiplicador selecionado inicialmente na Calculadora.</small>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={restoreDefaults}
          >
            <RotateCcw size={16} />
            Restaurar valores iniciais
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={saveSettings}
            disabled={saving}
          >
            <Save size={17} />
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>

      <div className="panel settings-info">
        <strong>Importante sobre os preços dos filamentos</strong>
        <p>
          Os valores de PLA e PETG desta tela são referências para novos
          cadastros. Eles não alteram os preços dos rolos que já estão
          registrados no Estoque.
        </p>
      </div>
    </div>
  );
}
