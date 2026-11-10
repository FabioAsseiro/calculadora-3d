
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, RotateCcw } from 'lucide-react';
import { db, type Filament, type Printer, type Product } from '../database/db';
import { Save, ImagePlus, X } from 'lucide-react';

type MaterialLine = {
  id: number;
  filamentId: string;
  grams: string;
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export default function Calculadora() {
  const [showSaveProduct, setShowSaveProduct] = useState(false);
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);

  const [productName, setProductName] = useState('');
  const [printerId, setPrinterId] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Tempo total da impressão do lote
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');

  // Consumo e custos
  const [energyPrice, setEnergyPrice] = useState(0.78);
  const [energyFactor, setEnergyFactor] = useState('50');
  const [insurance, setInsurance] = useState('14');
  const [fixedCost, setFixedCost] = useState('0');
  const [extrasPerUnit, setExtrasPerUnit] = useState('0');

  // Mão de obra
  const [laborMode, setLaborMode] = useState<'hour' | 'piece'>('piece');
  const [laborValue, setLaborValue] = useState('0');
  const [laborHours, setLaborHours] = useState('0');

  // Preço de venda
  const [priceMode, setPriceMode] = useState<'multiplier' | 'margin'>(
    'multiplier'
  );
  const [multiplier, setMultiplier] = useState('4');
  const [margin, setMargin] = useState('50');
  const [storePercentage, setStorePercentage] = useState('50');

  // Filamentos utilizados na mesa inteira
  const [materials, setMaterials] = useState<MaterialLine[]>([
    { id: 1, filamentId: '', grams: '0' },
  ]);

  useEffect(() => {
    async function loadData() {
      const [
        filamentData,
        printerData,
        energySetting,
        storeSetting,
        multiplierSetting,
      ] = await Promise.all([
        db.filaments.toArray(),
        db.printers.toArray(),
        db.settings.get('energyPrice'),
        db.settings.get('retailStorePercentage'),
        db.settings.get('defaultMultiplier'),
      ]);

      setFilaments(filamentData.filter((item) => item.active));
      setPrinters(printerData.filter((item) => item.active));

      if (energySetting && typeof energySetting.value === 'number') {
        setEnergyPrice(energySetting.value);
      }

      if (storeSetting && typeof storeSetting.value === 'number') {
        setStorePercentage(String(storeSetting.value));
      }

      if (
        multiplierSetting &&
        typeof multiplierSetting.value === 'number'
      ) {
        setMultiplier(String(multiplierSetting.value));
      }
    }

    loadData();
  }, []);

  const selectedPrinter = printers.find(
    (printer) => String(printer.id) === printerId
  );

  const totalQuantity = Math.max(1, Number(quantity) || 1);

  // Tempo total da impressão em horas
  const printTime =
    Math.max(0, Number(hours) || 0) +
    Math.max(0, Number(minutes) || 0) / 60;

  // Consumo total de filamentos na mesa
  const totalMaterialGrams = materials.reduce(
    (total, line) => total + Math.max(0, Number(line.grams) || 0),
    0
  );

  // Consumo médio de filamento por peça
  const materialGramsPerUnit = totalMaterialGrams / totalQuantity;

  // Custo total dos filamentos utilizados na mesa
  const materialCostBatch = materials.reduce((total, line) => {
    const filament = filaments.find(
      (item) => String(item.id) === line.filamentId
    );

    if (!filament) return total;

    const grams = Math.max(0, Number(line.grams) || 0);
    const spoolWeight = filament.spoolWeight || 1000;
    const costPerGram = filament.pricePerKg / spoolWeight;

    return total + grams * costPerGram;
  }, 0);

  // Custo de energia da mesa inteira
  const energyCostBatch = selectedPrinter
    ? (selectedPrinter.powerWatts / 1000) *
      printTime *
      energyPrice *
      (Math.max(0, Number(energyFactor) || 0) / 100)
    : 0;

  // Desgaste da impressora por hora de utilização
  const machineCostBatch =
    selectedPrinter && selectedPrinter.usefulHours > 0
      ? (selectedPrinter.purchasePrice / selectedPrinter.usefulHours) *
        printTime
      : 0;

  // Mão de obra
  const laborCostBatch =
    laborMode === 'hour'
      ? Math.max(0, Number(laborValue) || 0) *
        Math.max(0, Number(laborHours) || 0)
      : Math.max(0, Number(laborValue) || 0) * totalQuantity;

  // Acessórios e embalagem por peça
  const extrasBatch =
    Math.max(0, Number(extrasPerUnit) || 0) * totalQuantity;

  // Custos fixos rateados por peça
  const fixedCostBatch =
    Math.max(0, Number(fixedCost) || 0) * totalQuantity;

  // Soma dos custos diretos da mesa
  const directCostBatch =
    materialCostBatch +
    energyCostBatch +
    machineCostBatch +
    laborCostBatch +
    extrasBatch +
    fixedCostBatch;

  // Seguro aplicado aos custos diretos do lote
  const insuranceCostBatch =
    directCostBatch * (Math.max(0, Number(insurance) || 0) / 100);

  // Custo final do lote
  const totalCostBatch = directCostBatch + insuranceCostBatch;

  // Custo de cada unidade
  const unitCost = totalCostBatch / totalQuantity;

  // Multiplicador e margem
  const multiplierValue = Math.max(0, Number(multiplier) || 0);
  const marginValue = Math.min(
    99.99,
    Math.max(0, Number(margin) || 0)
  );

  // Preço de venda para consumidor
  const consumerPrice =
    priceMode === 'multiplier'
      ? unitCost * multiplierValue
      : unitCost / (1 - marginValue / 100);

  // Preço para lojista
  const storePrice =
    consumerPrice *
    (Math.max(0, Number(storePercentage) || 0) / 100);

  // Lucro estimado por unidade
  const consumerProfit = consumerPrice - unitCost;
  const storeProfit = storePrice - unitCost;

  const canCalculate =
    Boolean(productName.trim()) &&
    Boolean(selectedPrinter) &&
    materials.some(
      (line) => line.filamentId && Number(line.grams) > 0
    );

  // Adicionar outro filamento
  const addMaterial = () => {
    setMaterials((current) => [
      ...current,
      {
        id: Date.now(),
        filamentId: '',
        grams: '0',
      },
    ]);
  };

  // Atualizar filamento ou gramas da mesa
  const updateMaterial = (
    id: number,
    field: 'filamentId' | 'grams',
    value: string
  ) => {
    setMaterials((current) =>
      current.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  // Remover filamento
  const removeMaterial = (id: number) => {
    setMaterials((current) =>
      current.length > 1
        ? current.filter((line) => line.id !== id)
        : current
    );
  };

  // Limpar formulário
  const resetForm = () => {
    setProductName('');
    setPrinterId('');
    setQuantity('1');
    setHours('0');
    setMinutes('0');
    setEnergyFactor('50');
    setInsurance('14');
    setFixedCost('0');
    setExtrasPerUnit('0');
    setLaborMode('piece');
    setLaborValue('0');
    setLaborHours('0');
    setPriceMode('multiplier');
    setMultiplier('4');
    setMargin('50');
    setMaterials([
      { id: Date.now(), filamentId: '', grams: '0' },
    ]);
  };

  const costRows = useMemo(
    () => [
      { label: 'Filamentos', value: materialCostBatch },
      { label: 'Energia', value: energyCostBatch },
      { label: 'Desgaste da máquina', value: machineCostBatch },
      { label: 'Mão de obra', value: laborCostBatch },
      { label: 'Acessórios e embalagem', value: extrasBatch },
      { label: 'Custos fixos', value: fixedCostBatch },
      { label: 'Seguro de produção', value: insuranceCostBatch },
    ],
    [
      materialCostBatch,
      energyCostBatch,
      machineCostBatch,
      laborCostBatch,
      extrasBatch,
      fixedCostBatch,
      insuranceCostBatch,
    ]
  );


async function saveProduct() {
  if (!productName.trim()) {
    alert('Informe o nome do produto.');
    return;
  }

  if (!canCalculate) {
    alert('Complete os dados da calculadora antes de salvar.');
    return;
  }

  const product: Product = {
    name: productName.trim(),
    photo: productPhoto,
    printerName: selectedPrinter?.name || '',
    quantity: totalQuantity,
    printTimeHours: printTime,

    materials: materials
      .filter((line) => line.filamentId && Number(line.grams) > 0)
      .map((line) => {
        const filament = filaments.find(
          (item) => String(item.id) === line.filamentId
        );

        return {
          filamentId: filament?.id ?? null,
          filamentName: filament
            ? `${filament.brand} - ${filament.material} - ${filament.color}`
            : 'Filamento não identificado',
          grams: Math.max(0, Number(line.grams) || 0),
        };
      }),

    totalMaterialGrams,
    unitCost,
    batchCost: totalCostBatch,
    consumerPrice,
    storePrice,
    consumerProfit,
    storeProfit,
    createdAt: new Date().toISOString(),
  };

  setSavingProduct(true);

  try {
    await db.products.add(product);
    setShowSaveProduct(false);
    setProductPhoto(null);
    alert('Produto salvo no catálogo com sucesso!');
  } catch (error) {
    console.error(error);
    alert('Não foi possível salvar o produto.');
  } finally {
    setSavingProduct(false);
  }
}

function handleProductPhoto(file?: File) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Selecione um arquivo de imagem.');
    return;
  }

  if (file.size > 3 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 3 MB.');
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    setProductPhoto(String(reader.result));
  };

  reader.readAsDataURL(file);
}


  return (
    <div className="calculator-page">
      <div className="calculator-heading">
        <div>
          <h1>Calculadora 3D</h1>
          <p>Calcule o custo e o preço de venda das suas peças.</p>
        </div>

        <button className="secondary-button" onClick={resetForm}>
          <RotateCcw size={16} />
          Limpar cálculo
        </button>
      </div>

      <div className="calculator-layout">
        <div className="calculator-form">
          {/* DADOS DO PRODUTO */}
          <section className="calc-section">
            <h2>
              <Calculator size={19} /> Dados do produto
            </h2>

            <label>Nome do produto</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex.: Chaveiro personalizado"
            />

            <div className="form-grid">
              <div>
                <label>Impressora</label>
                <select
                  value={printerId}
                  onChange={(e) => setPrinterId(e.target.value)}
                >
                  <option value="">Selecione a impressora</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Quantidade de peças</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* FILAMENTOS */}
          <section className="calc-section">
            <h2>Filamentos utilizados</h2>

            <p className="section-description">
              Informe cada cor e o peso total utilizado na mesa de impressão.
            </p>

            {materials.map((line, index) => (
              <div className="material-line" key={line.id}>
                <div>
                  <label>Filamento {index + 1}</label>
                  <select
                    value={line.filamentId}
                    onChange={(e) =>
                      updateMaterial(
                        line.id,
                        'filamentId',
                        e.target.value
                      )
                    }
                  >
                    <option value="">Selecione a cor/material</option>

                    {filaments.map((filament) => (
                      <option key={filament.id} value={filament.id}>
                        {filament.brand} - {filament.material} -{' '}
                        {filament.color}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Gramas utilizadas na mesa</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={line.grams}
                    onChange={(e) =>
                      updateMaterial(
                        line.id,
                        'grams',
                        e.target.value
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  className="icon-button"
                  title="Remover filamento"
                  onClick={() => removeMaterial(line.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}

            {/* RESUMO DO CONSUMO */}
            <div className="material-summary">
              <div>
                <span>Consumo total da mesa</span>
                <strong>{totalMaterialGrams.toFixed(1)} g</strong>
              </div>

              <div>
                <span>Consumo médio por peça</span>
                <strong>{materialGramsPerUnit.toFixed(2)} g</strong>
              </div>
            </div>

            <button
              className="add-button"
              type="button"
              onClick={addMaterial}
            >
              <Plus size={16} /> Adicionar outro filamento
            </button>
          </section>

          {/* TEMPO E ENERGIA */}
          <section className="calc-section">
            <h2>Tempo e energia</h2>

            <label>Tempo total de impressão do lote</label>

            <div className="form-grid">
              <div>
                <label>Horas</label>
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>

              <div>
                <label>Minutos</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label>Consumo médio estimado (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={energyFactor}
                  onChange={(e) => setEnergyFactor(e.target.value)}
                />
              </div>

              <div>
                <label>Tarifa de energia (R$/kWh)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={energyPrice}
                  onChange={(e) =>
                    setEnergyPrice(Number(e.target.value))
                  }
                />
              </div>
            </div>
          </section>

          {/* MÃO DE OBRA E OUTROS CUSTOS */}
          <section className="calc-section">
            <h2>Mão de obra e outros custos</h2>

            <label>Forma de calcular a mão de obra</label>
            <select
              value={laborMode}
              onChange={(e) =>
                setLaborMode(e.target.value as 'hour' | 'piece')
              }
            >
              <option value="piece">Valor por peça</option>
              <option value="hour">Valor por hora</option>
            </select>

            <div className="form-grid">
              <div>
                <label>
                  {laborMode === 'hour'
                    ? 'Valor da hora (R$)'
                    : 'Valor por peça (R$)'}
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborValue}
                  onChange={(e) => setLaborValue(e.target.value)}
                />
              </div>

              {laborMode === 'hour' && (
                <div>
                  <label>Horas de mão de obra no lote</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="form-grid">
              <div>
                <label>Acessórios e embalagem por peça (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extrasPerUnit}
                  onChange={(e) => setExtrasPerUnit(e.target.value)}
                />
              </div>

              <div>
                <label>Custo fixo rateado por peça (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fixedCost}
                  onChange={(e) => setFixedCost(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* PRECIFICAÇÃO */}
          <section className="calc-section">
            <h2>Precificação</h2>

            <label>Como deseja calcular o preço?</label>
            <select
              value={priceMode}
              onChange={(e) =>
                setPriceMode(
                  e.target.value as 'multiplier' | 'margin'
                )
              }
            >
              <option value="multiplier">
                Multiplicador sobre o custo
              </option>
              <option value="margin">Margem de lucro desejada</option>
            </select>

            {priceMode === 'multiplier' ? (
              <div>
                <label>Multiplicador</label>
                <select
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                >
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                  <option value="4">4x</option>
                  <option value="5">5x</option>
                </select>
              </div>
            ) : (
              <div>
                <label>Margem desejada (%)</label>
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.1"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>
            )}

            <div>
              <label>
                Preço do lojista (% do preço consumidor)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={storePercentage}
                onChange={(e) => setStorePercentage(e.target.value)}
              />
            </div>

            <div>
              <label>Seguro de produção (%)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
              />
              <small>
                Reserva para imprevistos, aplicada sobre os custos diretos.
              </small>
            </div>
          </section>
        </div>

        {/* RESULTADOS */}
        <aside className="calculator-results">
          <h2>Resultado do cálculo</h2>

          <p className="section-description">
            {productName || 'Seu produto'} · {totalQuantity} unidade(s)
          </p>

          {!selectedPrinter && (
            <p className="warning">
              Cadastre e selecione uma impressora para calcular energia e desgaste.
            </p>
          )}

          {filaments.length === 0 && (
            <p className="warning">
              Cadastre seus filamentos antes de realizar o cálculo.
            </p>
          )}

          {!canCalculate && (
            <p className="warning">
              Informe o produto, a impressora e pelo menos um filamento com peso.
            </p>
          )}

          <div className="result-main">
            <span>Custo por unidade</span>
            <strong>{money(unitCost)}</strong>
            <small>
              Custo total do lote: {money(totalCostBatch)}
            </small>
          </div>

          <div className="result-breakdown">
            <h3>Composição do custo do lote</h3>

            {costRows.map((row) => (
              <div className="result-row" key={row.label}>
                <span>{row.label}</span>
                <strong>{money(row.value)}</strong>
              </div>
            ))}

            <div className="result-row total">
              <span>Total do lote</span>
              <strong>{money(totalCostBatch)}</strong>
            </div>
          </div>

          <div className="price-option">
            <span>Preço consumidor</span>
            <strong>{money(consumerPrice)}</strong>
            <small>
              Lucro estimado por peça: {money(consumerProfit)}
            </small>
          </div>

          <div className="price-option">
            <span>Preço lojista</span>
            <strong>{money(storePrice)}</strong>
            <small>
              Lucro estimado por peça: {money(storeProfit)}
            </small>
          </div>

          <p className="result-note">
            Valores estimados. Impostos e taxas de venda não estão incluídos.
          </p>

          <button
            className="primary-button save-product-button"
            type="button"
            disabled={!canCalculate}
            onClick={() => setShowSaveProduct(true)}
          >
            <Save size={17} />
            Salvar no catálogo de produtos
          </button>
        </aside>
      </div>

      {showSaveProduct && (
        <div className="stock-modal-backdrop">
          <div className="stock-modal save-product-modal">
            <div className="save-product-heading">
              <div>
                <h2>Salvar produto no catálogo</h2>
                <p>Confira o nome e adicione uma foto, se desejar.</p>
              </div>

              <button
                className="icon-button"
                type="button"
                onClick={() => setShowSaveProduct(false)}
              >
                <X size={19} />
              </button>
            </div>

            <label>Nome do produto</label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Nome do produto"
            />

            <label>Foto do produto (opcional)</label>

            <label className="product-photo-upload">
              {productPhoto ? (
                <img src={productPhoto} alt="Foto do produto" />
              ) : (
                <>
                  <ImagePlus size={30} />
                  <span>Escolher foto do computador</span>
                  <small>Imagem de até 3 MB</small>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleProductPhoto(e.target.files?.[0])}
              />
            </label>

            {productPhoto && (
              <button
                className="text-button"
                type="button"
                onClick={() => setProductPhoto(null)}
              >
                Remover foto
              </button>
            )}

            <div className="save-product-summary">
              <div>
                <span>Custo por unidade</span>
                <strong>{money(unitCost)}</strong>
              </div>

              <div>
                <span>Preço consumidor</span>
                <strong>{money(consumerPrice)}</strong>
              </div>

              <div>
                <span>Preço lojista</span>
                <strong>{money(storePrice)}</strong>
              </div>
            </div>

            <div className="stock-modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowSaveProduct(false)}
              >
                Cancelar
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={savingProduct}
                onClick={saveProduct}
              >
                <Save size={16} />
                {savingProduct ? 'Salvando...' : 'Confirmar e salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
