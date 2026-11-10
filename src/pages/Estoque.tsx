
import { useEffect, useMemo, useState } from 'react';
import { Package, Plus, Search, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { db, type Filament, type Supply } from '../database/db';

type StockTab = 'filamentos' | 'acessorios';

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export default function Estoque() {
  const [tab, setTab] = useState<StockTab>('filamentos');
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [supplyName, setSupplyName] = useState('');
  const [supplyCategory, setSupplyCategory] = useState('Acessório');
  const [supplyUnit, setSupplyUnit] = useState('unidade');
  const [supplyPrice, setSupplyPrice] = useState('0');
  const [supplyStock, setSupplyStock] = useState('0');
  const [supplyMinimum, setSupplyMinimum] = useState('0');

  const [showFilamentForm, setShowFilamentForm] = useState(false);

const [filamentBrand, setFilamentBrand] = useState('');
const [filamentMaterial, setFilamentMaterial] =
  useState<Filament['material']>('PLA');
const [filamentColor, setFilamentColor] = useState('');
const [filamentPrice, setFilamentPrice] = useState('110');
const [filamentWeight, setFilamentWeight] = useState('1000');
const [filamentRemaining, setFilamentRemaining] = useState('1000');
const [filamentMinimum, setFilamentMinimum] = useState('200');
  

  async function loadStock() {
    const [filamentData, supplyData] = await Promise.all([
      db.filaments.toArray(),
      db.supplies.toArray(),
    ]);
    setFilaments(filamentData);
    setSupplies(supplyData);
  }

  useEffect(() => {
    loadStock();
  }, []);

  const filteredFilaments = useMemo(() => {
    const term = search.toLowerCase();
    return filaments.filter((item) =>
      `${item.brand} ${item.material} ${item.color}`.toLowerCase().includes(term)
    );
  }, [filaments, search]);

  const filteredSupplies = useMemo(() => {
    const term = search.toLowerCase();
    return supplies.filter((item) =>
      `${item.name} ${item.category}`.toLowerCase().includes(term)
    );
  }, [supplies, search]);

  const lowFilaments = filaments.filter(
    (item) => item.remainingGrams <= item.minimumStock
  ).length;

  const lowSupplies = supplies.filter(
    (item) => item.stock <= item.minimumStock
  ).length;

  const filamentValue = filaments.reduce((total, item) => {
    const spoolWeight = item.spoolWeight || 1000;
    return total + (item.remainingGrams / spoolWeight) * item.pricePerKg;
  }, 0);

  const supplyValue = supplies.reduce(
    (total, item) => total + item.stock * item.unitPrice,
    0
  );

  function openNewSupply() {
    setEditingId(null);
    setSupplyName('');
    setSupplyCategory('Acessório');
    setSupplyUnit('unidade');
    setSupplyPrice('0');
    setSupplyStock('0');
    setSupplyMinimum('0');
    setShowForm(true);
  }

  function openEditSupply(item: Supply) {
    setEditingId(item.id ?? null);
    setSupplyName(item.name);
    setSupplyCategory(item.category);
    setSupplyUnit(item.unit);
    setSupplyPrice(String(item.unitPrice));
    setSupplyStock(String(item.stock));
    setSupplyMinimum(String(item.minimumStock));
    setShowForm(true);
  }

  function openNewFilament() {
  setFilamentBrand('');
  setFilamentMaterial('PLA');
  setFilamentColor('');
  setFilamentPrice('110');
  setFilamentWeight('1000');
  setFilamentRemaining('1000');
  setFilamentMinimum('200');
  setShowFilamentForm(true);
}

async function saveFilament() {
  if (!filamentBrand.trim() || !filamentColor.trim()) {
    alert('Informe a marca e a cor do filamento.');
    return;
  }

  const weight = Number(filamentWeight);
  const remaining = Number(filamentRemaining);
  const price = Number(filamentPrice);
  const minimum = Number(filamentMinimum);

  if (
    !Number.isFinite(weight) || weight <= 0 ||
    !Number.isFinite(remaining) || remaining < 0 ||
    remaining > weight ||
    !Number.isFinite(price) || price < 0 ||
    !Number.isFinite(minimum) || minimum < 0
  ) {
    alert('Confira os pesos, o preço e o estoque mínimo.');
    return;
  }

  await db.filaments.add({
    brand: filamentBrand.trim(),
    material: filamentMaterial,
    color: filamentColor.trim(),
    pricePerKg: price,
    spoolWeight: weight,
    remainingGrams: remaining,
    minimumStock: minimum,
    active: true,
  });

  setShowFilamentForm(false);
  await loadStock();
}

  async function saveSupply() {
    if (!supplyName.trim()) {
      alert('Informe o nome do material.');
      return;
    }

    const data = {
      name: supplyName.trim(),
      category: supplyCategory,
      unit: supplyUnit,
      unitPrice: Math.max(0, Number(supplyPrice) || 0),
      stock: Math.max(0, Number(supplyStock) || 0),
      minimumStock: Math.max(0, Number(supplyMinimum) || 0),
    };

    if (editingId !== null) {
      await db.supplies.update(editingId, data);
    } else {
      await db.supplies.add(data);
    }

    setShowForm(false);
    await loadStock();
  }

  async function deleteSupply(item: Supply) {
    if (!confirm(`Deseja excluir "${item.name}" do estoque?`)) return;
    if (item.id !== undefined) {
      await db.supplies.delete(item.id);
      await loadStock();
    }
  }

  async function adjustFilament(item: Filament, direction: 1 | -1) {
    const answer = prompt(
      direction === 1
        ? `Quantos gramas deseja adicionar a ${item.color}?`
        : `Quantos gramas deseja retirar de ${item.color}?`
    );

    if (answer === null) return;

    const amount = Number(answer.replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Informe uma quantidade válida em gramas.');
      return;
    }

    const nextValue = item.remainingGrams + amount * direction;

    if (nextValue < 0) {
      alert('O estoque não pode ficar negativo.');
      return;
    }

    if (item.id !== undefined) {
      await db.filaments.update(item.id, { remainingGrams: nextValue });
      await loadStock();
    }
  }

  async function adjustSupply(item: Supply, direction: 1 | -1) {
    const answer = prompt(
      direction === 1
        ? `Quantas unidades deseja adicionar a ${item.name}?`
        : `Quantas unidades deseja retirar de ${item.name}?`
    );

    if (answer === null) return;

    const amount = Number(answer.replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const nextValue = item.stock + amount * direction;

    if (nextValue < 0) {
      alert('O estoque não pode ficar negativo.');
      return;
    }

    if (item.id !== undefined) {
      await db.supplies.update(item.id, { stock: nextValue });
      await loadStock();
    }
  }

  return (
    <div className="stock-page">
      <div className="stock-heading">
        <div>
          <h1>Estoque</h1>
          <p>Controle seus filamentos, acessórios e materiais.</p>
        </div>

        {tab === 'filamentos' ? (
          <button className="primary-button" onClick={openNewFilament}>
            <Plus size={17} /> Novo filamento
          </button>
        ) : (
          <button className="primary-button" onClick={openNewSupply}>
            <Plus size={17} /> Novo material
          </button>
        )}
      </div>

      <div className="stock-summary">
        <div className="stock-summary-card">
          <Package size={21} />
          <span>Valor em filamentos</span>
          <strong>{money(filamentValue)}</strong>
          <small>{filaments.length} cadastro(s)</small>
        </div>

        <div className="stock-summary-card">
          <Package size={21} />
          <span>Valor em acessórios</span>
          <strong>{money(supplyValue)}</strong>
          <small>{supplies.length} cadastro(s)</small>
        </div>

        <div className="stock-summary-card stock-alert-card">
          <span>Itens com estoque baixo</span>
          <strong>{lowFilaments + lowSupplies}</strong>
          <small>{lowFilaments} filamento(s) · {lowSupplies} acessório(s)</small>
        </div>
      </div>

      <div className="stock-panel">
        <div className="stock-toolbar">
          <div className="stock-tabs">
            <button
              className={tab === 'filamentos' ? 'active' : ''}
              onClick={() => { setTab('filamentos'); setSearch(''); }}
            >
              Filamentos ({filaments.length})
            </button>
            <button
              className={tab === 'acessorios' ? 'active' : ''}
              onClick={() => { setTab('acessorios'); setSearch(''); }}
            >
              Acessórios ({supplies.length})
            </button>
          </div>

          <div className="stock-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no estoque..."
            />
          </div>
        </div>

        {tab === 'filamentos' ? (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Marca / Material</th>
                  <th>Cor</th>
                  <th>Estoque atual</th>
                  <th>Estoque mínimo</th>
                  <th>Valor restante</th>
                  <th>Status</th>
                  <th>Movimentar</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilaments.map((item) => {
                  const low = item.remainingGrams <= item.minimumStock;
                  const value =
                    (item.remainingGrams / (item.spoolWeight || 1000)) *
                    item.pricePerKg;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.brand}</strong>
                        <small>{item.material}</small>
                      </td>
                      <td>{item.color}</td>
                      <td><strong>{item.remainingGrams.toFixed(1)} g</strong></td>
                      <td>{item.minimumStock} g</td>
                      <td>{money(value)}</td>
                      <td>
                        <span className={`stock-status ${low ? 'low' : 'ok'}`}>
                          {low ? 'Estoque baixo' : 'Disponível'}
                        </span>
                      </td>
                      <td>
                        <div className="stock-actions">
                          <button title="Adicionar gramas" onClick={() => adjustFilament(item, 1)}>
                            <ArrowDownCircle size={17} />
                          </button>
                          <button title="Retirar gramas" onClick={() => adjustFilament(item, -1)}>
                            <ArrowUpCircle size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredFilaments.length === 0 && (
              <p className="stock-empty">Nenhum filamento encontrado.</p>
            )}
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Unidade</th>
                  <th>Valor unitário</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplies.map((item) => {
                  const low = item.stock <= item.minimumStock;

                  return (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td>{item.category}</td>
                      <td><strong>{item.stock}</strong></td>
                      <td>{item.unit}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td>
                        <span className={`stock-status ${low ? 'low' : 'ok'}`}>
                          {low ? 'Estoque baixo' : 'Disponível'}
                        </span>
                      </td>
                      <td>
                        <div className="stock-actions">
                          <button title="Adicionar" onClick={() => adjustSupply(item, 1)}>
                            <ArrowDownCircle size={17} />
                          </button>
                          <button title="Retirar" onClick={() => adjustSupply(item, -1)}>
                            <ArrowUpCircle size={17} />
                          </button>
                          <button title="Editar" onClick={() => openEditSupply(item)}>
                            <Pencil size={16} />
                          </button>
                          <button title="Excluir" onClick={() => deleteSupply(item)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSupplies.length === 0 && (
              <p className="stock-empty">
                Nenhum acessório cadastrado. Clique em “Novo material” para começar.
              </p>
            )}
          </div>
        )}
      </div>

{showFilamentForm && (
  <div className="stock-modal-backdrop">
    <div className="stock-modal">
      <h2>Novo rolo de filamento</h2>

      <p className="section-description">
        Cadastre cada rolo individualmente para controlar seu consumo.
      </p>

      <label>Marca</label>
      <input
        value={filamentBrand}
        onChange={(e) => setFilamentBrand(e.target.value)}
        placeholder="Ex.: Bambu Lab, Voolt..."
      />

      <div className="form-grid">
        <div>
          <label>Material</label>
          <select
            value={filamentMaterial}
            onChange={(e) =>
              setFilamentMaterial(e.target.value as Filament['material'])
            }
          >
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>

        <div>
          <label>Cor</label>
          <input
            value={filamentColor}
            onChange={(e) => setFilamentColor(e.target.value)}
            placeholder="Ex.: Branco, Rosa..."
          />
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label>Preço pago pelo rolo (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={filamentPrice}
            onChange={(e) => setFilamentPrice(e.target.value)}
          />
        </div>

        <div>
          <label>Peso original do rolo (g)</label>
          <input
            type="number"
            min="1"
            value={filamentWeight}
            onChange={(e) => setFilamentWeight(e.target.value)}
          />
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label>Peso restante atual (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={filamentRemaining}
            onChange={(e) => setFilamentRemaining(e.target.value)}
          />
        </div>

        <div>
          <label>Estoque mínimo (g)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={filamentMinimum}
            onChange={(e) => setFilamentMinimum(e.target.value)}
          />
        </div>
      </div>

      <div className="stock-modal-actions">
        <button
          className="secondary-button"
          onClick={() => setShowFilamentForm(false)}
        >
          Cancelar
        </button>

        <button className="primary-button" onClick={saveFilament}>
          Salvar filamento
        </button>
      </div>
    </div>
  </div>
)}

      {showForm && (
        <div className="stock-modal-backdrop">
          <div className="stock-modal">
            <h2>{editingId !== null ? 'Editar material' : 'Novo material'}</h2>

            <label>Nome do material</label>
            <input value={supplyName} onChange={(e) => setSupplyName(e.target.value)} placeholder="Ex.: Argola para chaveiro" />

            <div className="form-grid">
              <div>
                <label>Categoria</label>
                <select value={supplyCategory} onChange={(e) => setSupplyCategory(e.target.value)}>
                  <option>Acessório</option>
                  <option>Embalagem</option>
                  <option>Papelaria</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label>Unidade</label>
                <select value={supplyUnit} onChange={(e) => setSupplyUnit(e.target.value)}>
                  <option value="unidade">Unidade</option>
                  <option value="pacote">Pacote</option>
                  <option value="metro">Metro</option>
                  <option value="folha">Folha</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div>
                <label>Preço por unidade (R$)</label>
                <input type="number" min="0" step="0.01" value={supplyPrice} onChange={(e) => setSupplyPrice(e.target.value)} />
              </div>
              <div>
                <label>Quantidade em estoque</label>
                <input type="number" min="0" step="0.1" value={supplyStock} onChange={(e) => setSupplyStock(e.target.value)} />
              </div>
            </div>

            <label>Estoque mínimo</label>
            <input type="number" min="0" step="0.1" value={supplyMinimum} onChange={(e) => setSupplyMinimum(e.target.value)} />

            <div className="stock-modal-actions">
              <button className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="primary-button" onClick={saveSupply}>Salvar material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
