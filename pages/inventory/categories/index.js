import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/inventory.module.css";
import Link from "next/link";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";

export default function CategoriesPage(){

const [categories,setCategories] = useState([]);
const [filtered,setFiltered] = useState([]);
const [search,setSearch] = useState("");
const [loading,setLoading] = useState(true);
const [suggestions,setSuggestions] = useState([]);
const [showModal,setShowModal] = useState(false);
const [categoryName,setCategoryName] = useState("");
const [categoryDescription,setCategoryDescription] = useState("");

useEffect(()=>{
loadCategories();
},[]);

useAppRefresh(loadCategories);

useEffect(()=>{
filterCategories();
},[search,categories]);

async function loadCategories(){

try{

const result = await inventoryOfflineRequest(
"inventory-categories-v2",
"/api/inventory/getCategories/"
);

if(result.success){
setCategories(result.data);
setFiltered(result.data);
}

}catch(err){
console.error(err);
}finally{
setLoading(false);
}

}

async function fetchSuggestions(value){

try{

const result = await inventoryRequest("/api/inventory/searchCategories/",{
body:{ search:value }
});

if(result.success){
setSuggestions(result.data);
}

}catch(err){
console.error(err);
}

}
function filterCategories(){

if(!search){
setFiltered(categories);
return;
}

const s = search.toLowerCase();

setFiltered(
categories.filter(c =>
c.category_name.toLowerCase().includes(s)
)
);

}

async function addCategory(){

if(!categoryName){
alert("Category name required");
return;
}

try{

const result = await inventoryRequest("/api/inventory/addCategory/",{
body:{
category_name:categoryName,
description:categoryDescription
}
});

if(result.success){

setCategoryName("");
setCategoryDescription("");
setShowModal(false);
loadCategories();

}else{
alert(result.error || "Failed");
}

}catch(err){
console.error(err);
}

}

return(

<Layout title="Categories">

<div className={styles.pageHeader}>

<h2>Categories</h2>

<button
className={styles.primaryBtn}
onClick={()=>setShowModal(true)}
>
+ Add Category
</button>

</div>

<input
className={styles.searchInput}
placeholder="Search category..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

{loading ? (

<p>Loading categories...</p>

):( 

<div className={styles.cardGrid}>

{filtered.map(c=>(

<Link key={c.id} href={`/inventory/categories/${c.id}`}>

<div className={styles.categoryCard}>

<h3>{c.category_name}</h3>

<p>{c.description || "No description"}</p>

</div>

</Link>

))}

</div>

)}

{showModal && (

<div className={styles.modalOverlay}>

<div className={styles.modalCard}>

<h3>Add Category</h3>

<input
placeholder="Category Name"
value={categoryName}
onChange={(e)=>{
setCategoryName(e.target.value);
fetchSuggestions(e.target.value);
}}

onKeyDown={(e)=>{ if(e.key==="Enter") addCategory();}}
/>

<textarea
placeholder="Description"
value={categoryDescription}
onChange={(e)=>setCategoryDescription(e.target.value)}
/>
{suggestions.length > 0 && (

<div className={styles.suggestionsBox}>

{suggestions.map(s => (

<div
key={s.id}
className={styles.suggestionItem}
onClick={()=>{
setCategoryName(s.category_name);
setSuggestions([]);
}}
>
{s.category_name}
</div>

))}

</div>

)}

<div className={styles.modalActions}>

<button
className={styles.secondaryBtn}
onClick={()=>setShowModal(false)}
>
Cancel
</button>

<button
className={styles.primaryBtn}
onClick={addCategory}
>
Create
</button>

</div>

</div>

</div>

)}

</Layout>

);

}
