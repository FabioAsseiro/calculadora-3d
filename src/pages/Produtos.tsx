
import { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Package, Pencil, Copy, Trash2, X,
  ImagePlus, Clock, Printer, Layers, Eye
} from 'lucide-react';
import { db, type Product } from '../database/db';
import './Produtos.css';

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProducts() {
    const data = await db.products.orderBy('createdAt').reverse().toArray();
    setProducts(data);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(term)
    );
  }, [products, search]);

  function formatMoney(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatTime(hours: number) {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}min`;
  }

  function startEditing(product: Product) {
    setEditing(product);
    setEditName(product.name);
    setEditPhoto(product.photo);
  }

  function handlePhoto(file?: File) {
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
    reader.onload = () => setEditPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveEdit() {
    if (!editing?.id || !editName.trim()) {
      alert('Informe o nome do produto.');
      return;
    }

    setSaving(true);
    try {
      await db.products.update(editing.id, {
        name: editName.trim(),
        photo: editPhoto
      });

      setEditing(null);
      await loadProducts();
    } catch {
      alert('Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  async function duplicateProduct(product: Product) {
    const { id, ...data } = product;

    await db.products.add({
      ...data,
      name: `${product.name} - Cópia`,
      createdAt: new Date().toISOString()
    });

    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    if (!product.id) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir "${product.name}"?`
    );

    if (!confirmed) return;

    await db.products.delete(product.id);
    if (selected?.id === product.id) setSelected(null);
    await loadProducts();
  }

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Produtos</h1>
          <p>Seu catálogo de peças e produtos impressos em 3D.</p>
        </div>

        <div className="products-total">
          <Package size={20} />
          <strong>{products.length}</strong>
          <span>produtos cadastrados</span>
        </div>
      </div>

      <div className="products-search">
        <Search size={19} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar produto pelo nome..."
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Limpar pesquisa">
            <X size={17} />
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="products-empty">
          <Package size={45} />
          <h3>{products.length === 0 ? 'Seu catálogo está vazio' : 'Nenhum produto encontrado'}</h3>
          <p>
            {products.length === 0
              ? 'Faça um cálculo e salve o resultado no catálogo para começar.'
              : 'Tente pesquisar usando outro nome.'}
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map(product => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                {product.photo ? (
                  <img src={product.photo} alt={product.name} />
                ) : (
                  <Package size={42} />
                )}
              </div>

              <div className="product-card-content">
                <h3>{product.name}</h3>

                <div className="product-prices">
                  <div>
                    <span>Custo unitário</span>
                    <strong>{formatMoney(product.unitCost)}</strong>
                  </div>
                  <div>
                    <span>Venda consumidor</span>
                    <strong>{formatMoney(product.consumerPrice)}</strong>
                  </div>
                  <div>
                    <span>Venda lojista</span>
                    <strong>{formatMoney(product.storePrice)}</strong>
                  </div>
                </div>

                <div className="product-card-actions">
                  <button onClick={() => setSelected(product)} title="Ver detalhes">
                    <Eye size={17} /> Detalhes
                  </button>
                  <button onClick={() => startEditing(product)} title="Editar">
                    <Pencil size={17} />
                  </button>
                  <button onClick={() => duplicateProduct(product)} title="Duplicar">
                    <Copy size={17} />
                  </button>
                  <button onClick={() => deleteProduct(product)} title="Excluir">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="product-modal-overlay" onClick={() => setSelected(null)}>
          <div className="product-modal" onClick={e => e.stopPropagation()}>
            <div className="product-modal-header">
              <h2>Detalhes do produto</h2>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>

            <div className="product-detail-heading">
              {selected.photo ? (
                <img src={selected.photo} alt={selected.name} />
              ) : (
                <Package size={45} />
              )}
              <div>
                <h3>{selected.name}</h3>
                <span>Cadastrado em {new Date(selected.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="product-detail-grid">
              <div><span>Custo unitário</span><strong>{formatMoney(selected.unitCost)}</strong></div>
              <div><span>Custo do lote</span><strong>{formatMoney(selected.batchCost)}</strong></div>
              <div><span>Preço consumidor</span><strong>{formatMoney(selected.consumerPrice)}</strong></div>
              <div><span>Preço lojista</span><strong>{formatMoney(selected.storePrice)}</strong></div>
              <div><span>Lucro consumidor</span><strong>{formatMoney(selected.consumerProfit)}</strong></div>
              <div><span>Lucro lojista</span><strong>{formatMoney(selected.storeProfit)}</strong></div>
            </div>

            <div className="product-detail-section">
              <h3><Printer size={18} /> Produção</h3>
              <p>Impressora: <strong>{selected.printerName}</strong></p>
              <p>Quantidade calculada: <strong>{selected.quantity} unidades</strong></p>
              <p>Tempo total: <strong>{formatTime(selected.printTimeHours)}</strong></p>
              <p>Material total: <strong>{selected.totalMaterialGrams} g</strong></p>
            </div>

            <div className="product-detail-section">
              <h3><Layers size={18} /> Materiais utilizados</h3>
              {selected.materials.map((material, index) => (
                <div className="product-material-row" key={index}>
                  <span>{material.filamentName}</span>
                  <strong>{material.grams} g</strong>
                </div>
              ))}
            </div>

            <button className="products-primary-button" onClick={() => {
              startEditing(selected);
              setSelected(null);
            }}>
              <Pencil size={17} /> Editar produto
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="product-modal-overlay" onClick={() => setEditing(null)}>
          <div className="product-modal edit-product-modal" onClick={e => e.stopPropagation()}>
            <div className="product-modal-header">
              <h2>Editar produto</h2>
              <button onClick={() => setEditing(null)}><X /></button>
            </div>

            <label>Nome do produto</label>
            <input
              className="product-edit-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Nome do produto"
            />

            <label>Foto do produto</label>
            <div className="product-photo-edit">
              {editPhoto ? (
                <img src={editPhoto} alt="Prévia do produto" />
              ) : (
                <ImagePlus size={35} />
              )}
              <label className="product-photo-button">
                <ImagePlus size={17} /> Escolher foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handlePhoto(e.target.files?.[0])}
                  hidden
                />
              </label>
              {editPhoto && (
                <button className="product-remove-photo" onClick={() => setEditPhoto(null)}>
                  Remover foto
                </button>
              )}
            </div>

            <div className="product-modal-actions">
              <button onClick={() => setEditing(null)}>Cancelar</button>
              <button className="products-primary-button" onClick={saveEdit} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
