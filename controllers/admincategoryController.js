const Category = require('../models/Category');

// Display all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find(); 
        res.render('admin/categories', { categories ,
            activePage:'categories'
        }); 
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.render('admin/categories', { error: 'Error fetching categories',
            activePage:'categories'
         });
    }
};
exports.addCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        res.redirect('/admin/categories'); 
    } catch (error) {
        console.error(error);
        res.render('admin/addCategory', { error: 'Error adding category. Please try again.'});
    }
};

// Get the form to add a category
exports.getAddCategoryForm = (req, res) => {
    res.render('admin/addCategory',{
        activePage:'categories'
    }); 
};

// Handle adding a new category
exports.postAddCategory = (req, res) => {
    const { name, description } = req.body;
    const newCategory = new Category({ name, description });
    newCategory.save()
        .then(() => {
            res.redirect('/admin/categories');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error adding category.');
        });
};

// Get the form to edit a category
exports.getEditCategoryForm = (req, res) => {
    const categoryId = req.params.id;
    Category.findById(categoryId)
        .then(category => {
            res.render('admin/editCategory', { category ,
                activePage:'categories'
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error retrieving category.');
        });
};

// Handle updating a category
exports.postEditCategory = (req, res) => {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    Category.findByIdAndUpdate(categoryId, { name, description })
        .then(() => {
            res.redirect('/admin/categories');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error updating category.');
        });
};

// Handle soft deleting a category
exports.deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id; 
        await Category.findByIdAndDelete(categoryId); 
        res.redirect('/admin/categories'); 
    } catch (error) {
        console.error('Error deleting category:', error);
        res.redirect('/admin/categories'); 
    }
}; 