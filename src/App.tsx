import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { Product, StockMovement, UserProfile } from './types';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  LogOut,
  User as UserIcon,
  Search,
  Filter,
  Warehouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            role: 'staff'
          };
          // We don't setDoc here to avoid permission issues if rules are strict, 
          // but for this app we'll assume staff by default.
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const qProducts = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      
      // Check for low stock
      prods.forEach(p => {
        if (p.quantity <= p.minStockLevel) {
          toast.warning(`Low Stock: ${p.name}`, {
            description: `Only ${p.quantity} ${p.unit} remaining (Min: ${p.minStockLevel})`,
            duration: 5000,
          });
        }
      });
    });

    const qMovements = query(collection(db, 'movements'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeMovements = onSnapshot(qMovements, (snapshot) => {
      setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement)));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeMovements();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error) {
      console.error(error);
      toast.error('Login failed');
    }
  };

  const handleLogout = () => signOut(auth);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F8F9FA]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Warehouse className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-200">
              <Warehouse className="w-16 h-16 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">WMS Penguin</h1>
            <p className="text-slate-500">Professional Warehouse Management System</p>
          </div>
          <Button onClick={handleLogin} size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-14 text-lg font-semibold shadow-lg shadow-blue-100 transition-all active:scale-95">
            Sign in with Google
          </Button>
          <p className="text-xs text-slate-400">Secure access for warehouse staff and administrators</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Warehouse className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">WMS Penguin</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Package className="w-5 h-5" />
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <History className="w-5 h-5" />
            History
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{profile?.role || 'Staff'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-bottom border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search SKU or Product Name..." 
                className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <AddProductDialog />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total Items</p>
                  <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-amber-100 p-3 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {products.filter(p => p.quantity <= p.minStockLevel).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <ArrowUpRight className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Recent Movements</p>
                  <p className="text-2xl font-bold text-slate-900">{movements.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {activeTab === 'inventory' ? (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Inventory Stock</CardTitle>
                    <CardDescription>Monitor and manage your warehouse items</CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-lg px-3 py-1 border-slate-200 text-slate-500">
                    {filteredProducts.length} Products
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Product</TableHead>
                      <TableHead className="font-semibold text-slate-600">SKU</TableHead>
                      <TableHead className="font-semibold text-slate-600">Category</TableHead>
                      <TableHead className="font-semibold text-slate-600">Stock</TableHead>
                      <TableHead className="font-semibold text-slate-600">Status</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={product.id} 
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-900">
                            <div className="flex flex-col">
                              <span>{product.name}</span>
                              <span className="text-xs text-slate-400 font-normal">{product.unit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{product.sku}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none rounded-md">
                              {product.category || 'General'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${product.quantity <= product.minStockLevel ? 'text-red-600' : 'text-slate-900'}`}>
                              {product.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            {product.quantity <= product.minStockLevel ? (
                              <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none rounded-md">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 border-none rounded-md">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <StockMovementDialog product={product} />
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
                {filteredProducts.length === 0 && (
                  <div className="p-12 text-center space-y-3">
                    <Package className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-slate-500">No products found matching your search.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-50 px-6 py-4">
                <CardTitle className="text-lg font-bold text-slate-900">Movement History</CardTitle>
                <CardDescription>Recent stock activities in the warehouse</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Time</TableHead>
                      <TableHead className="font-semibold text-slate-600">Product</TableHead>
                      <TableHead className="font-semibold text-slate-600">Type</TableHead>
                      <TableHead className="font-semibold text-slate-600">Quantity</TableHead>
                      <TableHead className="font-semibold text-slate-600">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => {
                      const prod = products.find(p => p.id === m.productId);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs text-slate-500">
                            {m.timestamp?.toDate().toLocaleString() || 'Pending...'}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">{prod?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            {m.type === 'IN' ? (
                              <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <ArrowDownLeft className="w-4 h-4" /> Stock In
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-600 font-semibold">
                                <ArrowUpRight className="w-4 h-4" /> Stock Out
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">{m.quantity}</TableCell>
                          <TableCell className="text-slate-500 italic text-sm">{m.notes || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: 0,
    minStockLevel: 5,
    unit: 'pcs'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        quantity: Number(formData.quantity),
        minStockLevel: Number(formData.minStockLevel),
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      });
      toast.success('Product added successfully');
      setOpen(false);
      setFormData({ name: '', sku: '', category: '', quantity: 0, minStockLevel: 5, unit: 'pcs' });
    } catch (error) {
      toast.error('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-lg shadow-blue-100">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
          <DialogDescription>Add a new item to the warehouse inventory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Stock</Label>
              <Input id="quantity" type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock Level</Label>
              <Input id="minStock" type="number" required value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit (e.g. pcs, kg, boxes)</Label>
            <Input id="unit" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12">
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StockMovementDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'OUT' && product.quantity < quantity) {
      toast.error('Insufficient stock');
      return;
    }
    setLoading(true);
    try {
      const newQuantity = type === 'IN' ? product.quantity + quantity : product.quantity - quantity;
      
      // Update product
      await updateDoc(doc(db, 'products', product.id), {
        quantity: newQuantity,
        lastUpdated: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      });

      // Record movement
      await addDoc(collection(db, 'movements'), {
        productId: product.id,
        type,
        quantity,
        notes,
        timestamp: serverTimestamp(),
        userId: auth.currentUser?.uid
      });

      toast.success(`Stock ${type === 'IN' ? 'added' : 'removed'} successfully`);
      setOpen(false);
      setQuantity(1);
      setNotes('');
    } catch (error) {
      toast.error('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
          Update Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>Update Stock: {product.name}</DialogTitle>
          <DialogDescription>Current Stock: {product.quantity} {product.unit}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Movement Type</Label>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={type === 'IN' ? 'default' : 'outline'}
                onClick={() => setType('IN')}
                className={`flex-1 rounded-xl h-12 ${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                Stock IN
              </Button>
              <Button 
                type="button"
                variant={type === 'OUT' ? 'default' : 'outline'}
                onClick={() => setType('OUT')}
                className={`flex-1 rounded-xl h-12 ${type === 'OUT' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
              >
                Stock OUT
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" min="1" required value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="rounded-xl h-12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Restock from supplier" className="rounded-xl h-12" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12">
              {loading ? 'Processing...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
