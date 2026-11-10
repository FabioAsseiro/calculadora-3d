
import { useEffect, useState } from 'react';
import { db, type Printer, type Filament } from '../database/db';
import { Plus, Trash2, Pencil, Printer as PrinterIcon, Package } from 'lucide-react';

type Tab = 'filamentos' | 'impressoras';

export default function Cadastros({ initialTab = 'filamentos' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [filament, setFilament] = useState({
    brand: '',
    material: 'PLA' as Filament['material'],
    color: '',
    pricePerKg: '110',
    spoolWeight: '1000',
    remainingGrams: '1000',
    minimumStock: '100'
  });

  const [printer, setPrinter] = useState({
    name: '',
    brand: '',
    model: '',
    powerWatts: '150',
    purchasePrice: '0',
    usefulHours: '5000'
  });

  async function loadData() {
    setFilaments(await db.filaments.toArray());
    setPrinters(await db.printers.toArray());
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveFilament(e: React.FormEvent) {
    e.preventDefault();

    const data: Filament = {
      ...filament,
      pricePerKg: Number(filament.pricePerKg),
      spoolWeight: Number(filament.spoolWeight),
      remainingGrams: Number(filament.remainingGrams),
      minimumStock: Number(filament.minimumStock),
      active: true
    };

    if (editingId !== null) {
      await db.filaments.update(editingId, data);
    } else {
      await db.filaments.add(data);
    }

    resetFilament();
    loadData();
  }

  async function savePrinter(e: React.FormEvent) {
    e.preventDefault();

    const data: Printer = {
      ...printer,
      powerWatts: Number(printer.powerWatts),
      purchasePrice: Number(printer.purchasePrice),
      usefulHours: Number(printer.usefulHours),
      active: true
    };

    if (editingId !== null) {
      await db.printers.update(editingId, data);
    } else {
      await db.printers.add(data);
    }

    resetPrinter();
    loadData();
  }

  function resetFilament() {
    setFilament({
      brand: '', material: 'PLA', color: '',
      pricePerKg: '110', spoolWeight: '1000',
      remainingGrams: '1000', minimumStock: '100'
    });
    setEditingId(null);
  }

  function resetPrinter() {
    setPrinter({
      name: '', brand: '', model: '',
      powerWatts: '150', purchasePrice: '0',
      usefulHours: '5000'
    });
    setEditingId(null);
  }

  async function deleteFilament(id: number) {
    if (confirm('Deseja excluir este filamento?')) {
      await db.filaments.delete(id);
      loadData();
    }
  }

  async function deletePrinter(id: number) {
    if (confirm('Deseja excluir esta impressora?')) {
      await db.printers.delete(id);
      loadData();
    }
  }

  function editFilament(item: Filament) {
    setTab('filamentos');
    setEditingId(item.id!);
    setFilament({
      brand: item.brand,
      material: item.material,
      color: item.color,
      pricePerKg: String(item.pricePerKg),
      spoolWeight: String(item.spoolWeight),
      remainingGrams: String(item.remainingGrams),
      minimumStock: String(item.minimumStock)
    });
  }

  function editPrinter(item: Printer) {
    setTab('impressoras');
    setEditingId(item.id!);
    setPrinter({
      name: item.name,
      brand: item.brand,
      model: item.model,
      powerWatts: String(item.powerWatts),
      purchasePrice: String(item.purchasePrice),
      usefulHours: String(item.usefulHours)
    });
  }

  const money = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });

  return (
    <div className="cadastros">
      <div className="cadastro-tabs">
        <button className={tab === 'filamentos' ? 'selected' : ''}
          onClick={() => { setTab('filamentos'); resetPrinter(); }}>
          <Package size={17} /> Filamentos
        </button>
        <button className={tab === 'impressoras' ? 'selected' : ''}
          onClick={() => { setTab('impressoras'); resetFilament(); }}>
          <PrinterIcon size={17} /> Impressoras
        </button>
      </div>

      {tab === 'filamentos' ? (
        <>
          <form className="cadastro-form" onSubmit={saveFilament}>
            <h2>{editingId !== null ? 'Editar filamento' : 'Novo filamento'}</h2>
            <div className="form-grid">
              <label>Marca
                <input required value={filament.brand}
                  onChange={e => setFilament({...filament, brand: e.target.value})}
                  placeholder="Ex.: Voolt, 3D Fila..." />
              </label>
              <label>Material
                <select value={filament.material}
                  onChange={e => setFilament({...filament, material: e.target.value as Filament['material']})}>
                  <option>PLA</option>
                  <option>PETG</option>
                  <option>ABS</option>
                  <option>TPU</option>
                  <option>OUTRO</option>
                </select>
              </label>
              <label>Cor
                <input required value={filament.color}
                  onChange={e => setFilament({...filament, color: e.target.value})}
                  placeholder="Ex.: Branco, Verde..." />
              </label>
              <label>Preço do rolo (R$)
                <input required type="number" min="0" step="0.01"
                  value={filament.pricePerKg}
                  onChange={e => setFilament({...filament, pricePerKg: e.target.value})} />
              </label>
              <label>Peso original (g)
                <input required type="number" min="1"
                  value={filament.spoolWeight}
                  onChange={e => setFilament({...filament, spoolWeight: e.target.value})} />
              </label>
              <label>Quantidade disponível (g)
                <input required type="number" min="0"
                  value={filament.remainingGrams}
                  onChange={e => setFilament({...filament, remainingGrams: e.target.value})} />
              </label>
              <label>Estoque mínimo (g)
                <input required type="number" min="0"
                  value={filament.minimumStock}
                  onChange={e => setFilament({...filament, minimumStock: e.target.value})} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-button">
                <Plus size={17} /> {editingId !== null ? 'Salvar alterações' : 'Cadastrar filamento'}
              </button>
              {editingId !== null && <button type="button" className="cancel-button" onClick={resetFilament}>Cancelar</button>}
            </div>
          </form>

          <div className="cadastro-list">
            <h2>Filamentos cadastrados ({filaments.length})</h2>
            {filaments.length === 0 ? <p>Nenhum filamento cadastrado ainda.</p> :
              filaments.map(item => (
                <div className="cadastro-row" key={item.id}>
                  <div className="color-dot" />
                  <div className="item-info">
                    <strong>{item.brand} — {item.color}</strong>
                    <span>{item.material} · {item.remainingGrams} g disponíveis</span>
                  </div>
                  <strong>{money(item.pricePerKg)}</strong>
                  <button onClick={() => editFilament(item)} title="Editar"><Pencil size={17}/></button>
                  <button onClick={() => deleteFilament(item.id!)} title="Excluir"><Trash2 size={17}/></button>
                </div>
              ))
            }
          </div>
        </>
      ) : (
        <>
          <form className="cadastro-form" onSubmit={savePrinter}>
            <h2>{editingId !== null ? 'Editar impressora' : 'Nova impressora'}</h2>
            <div className="form-grid">
              <label>Nome da impressora
                <input required value={printer.name}
                  onChange={e => setPrinter({...printer, name: e.target.value})}
                  placeholder="Ex.: Impressora principal" />
              </label>
              <label>Marca
                <input required value={printer.brand}
                  onChange={e => setPrinter({...printer, brand: e.target.value})}
                  placeholder="Ex.: Bambu Lab" />
              </label>
              <label>Modelo
                <input required value={printer.model}
                  onChange={e => setPrinter({...printer, model: e.target.value})}
                  placeholder="Ex.: A1, P1S..." />
              </label>
              <label>Potência (Watts)
                <input required type="number" min="1"
                  value={printer.powerWatts}
                  onChange={e => setPrinter({...printer, powerWatts: e.target.value})} />
              </label>
              <label>Valor de compra (R$)
                <input required type="number" min="0" step="0.01"
                  value={printer.purchasePrice}
                  onChange={e => setPrinter({...printer, purchasePrice: e.target.value})} />
              </label>
              <label>Vida útil estimada (horas)
                <input required type="number" min="1"
                  value={printer.usefulHours}
                  onChange={e => setPrinter({...printer, usefulHours: e.target.value})} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-button">
                <Plus size={17} /> {editingId !== null ? 'Salvar alterações' : 'Cadastrar impressora'}
              </button>
              {editingId !== null && <button type="button" className="cancel-button" onClick={resetPrinter}>Cancelar</button>}
            </div>
          </form>

          <div className="cadastro-list">
            <h2>Impressoras cadastradas ({printers.length})</h2>
            {printers.length === 0 ? <p>Nenhuma impressora cadastrada ainda.</p> :
              printers.map(item => (
                <div className="cadastro-row" key={item.id}>
                  <PrinterIcon size={23}/>
                  <div className="item-info">
                    <strong>{item.name} — {item.brand} {item.model}</strong>
                    <span>{item.powerWatts} W · Vida útil: {item.usefulHours} horas</span>
                  </div>
                  <strong>{money(item.purchasePrice)}</strong>
                  <button onClick={() => editPrinter(item)} title="Editar"><Pencil size={17}/></button>
                  <button onClick={() => deletePrinter(item.id!)} title="Excluir"><Trash2 size={17}/></button>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  );
}
